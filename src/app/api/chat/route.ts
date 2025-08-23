import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import bcrypt from "bcryptjs";
import { PLAN_LIMITS } from "@/lib/tokens";

type Provider = "openai" | "anthropic" | "google";

const PROVIDER_ENDPOINTS: Record<Exclude<Provider, "google">, string> = {
  openai: "https://api.openai.com/v1/chat/completions",
  anthropic: "https://api.anthropic.com/v1/messages",
};
const GOOGLE_BASE = "https://generativelanguage.googleapis.com/v1beta";

export async function POST(req: NextRequest) {
  try {
    console.log("🚀 /api/chat endpoint called");
    
    const apiKey = req.headers.get("authorization")?.replace("Bearer ", "") || "";
    if (!apiKey.startsWith("edgar_")) {
      return NextResponse.json({ error: "Missing or invalid API key" }, { status: 401 });
    }

    const body = await req.json();
    const model: string | undefined = body?.model;
    const messages: OpenAIMessage[] | undefined = body?.messages;
    let provider: Provider | undefined = body?.provider as Provider | undefined;
    if (!model || !messages) {
      return NextResponse.json({ error: "model, messages required" }, { status: 400 });
    }
    if (!provider) provider = resolveProviderFromModel(model);
    if (!provider) {
      return NextResponse.json({ error: "Unable to infer provider from model. Supply a known model or include provider." }, { status: 400 });
    }

    console.log(`🔍 Request details: model=${model}, provider=${provider}, messages=${messages.length}`);

    const { data: keyRows } = await supabaseAdmin
      .from("api_keys")
      .select("hash, user_id")
      .eq("prefix", apiKey.slice(0, 10))
      .order("created_at", { ascending: false })
      .limit(1);
    const keyRow = keyRows?.[0];
    if (!keyRow) return NextResponse.json({ error: "Key not found" }, { status: 401 });
    const valid = await bcrypt.compare(apiKey, keyRow.hash);
    if (!valid) return NextResponse.json({ error: "Invalid key" }, { status: 401 });

    const userId = keyRow.user_id as string;
    const timestamp = new Date().toISOString();

    console.log(`🔍 User authenticated: ${userId}`);

    // Check plan limits before processing
    const { data: user } = await supabaseAdmin.from("users").select("plan").eq("id", userId).single();
    const plan = (user?.plan || "starter") as keyof typeof PLAN_LIMITS;
    const limit = PLAN_LIMITS[plan];

    console.log(`🔍 User plan: ${plan}, limit: ${limit}`);

    // Check current billing cycle usage
    const { data: billingCycleUsage } = await supabaseAdmin.rpc("get_current_billing_cycle_start", {
      p_user_id: userId
    });
    
    const currentCycleStart = new Date(billingCycleUsage);
    const currentCycleEnd = new Date(currentCycleStart);
    currentCycleEnd.setMonth(currentCycleEnd.getMonth() + 1); // Add 1 month
    
    console.log(`🔍 Billing cycle: ${currentCycleStart.toISOString()} to ${currentCycleEnd.toISOString()}`);
    
    const { data: cycleUsage } = await supabaseAdmin
      .from("usage_details")
      .select("charged_tokens")
      .eq("user_id", userId)
      .gte("timestamp", currentCycleStart.toISOString())
      .lt("timestamp", currentCycleEnd.toISOString());
    
    const currentCycleTotal = cycleUsage?.reduce((sum, row) => sum + (row.charged_tokens || 0), 0) || 0;

    console.log(`🔍 Limit check for user ${userId}:`, {
      plan,
      limit,
      currentCycleTotal,
              wouldExceed: currentCycleTotal >= limit,
      cycleUsageCount: cycleUsage?.length || 0
    });

    // STRICT: Check if this request would exceed the billing cycle limit
          if (currentCycleTotal >= limit) {
      console.log(`🚫 BLOCKED: User ${userId} has exceeded limit (${currentCycleTotal}/${limit})`);
      return NextResponse.json({ 
        error: "REQUEST DENIED - Billing cycle limit exceeded",
        details: `You have used ${currentCycleTotal.toLocaleString()} tokens out of ${limit.toLocaleString()} allowed. Please upgrade your plan to continue.`,
        status: "blocked",
        current_usage: currentCycleTotal,
        limit: limit
      }, { status: 402 });
    }

    // ADDITIONAL SAFETY: Block if they're very close to the limit (within 100 tokens)
            if (currentCycleTotal >= (limit - 100)) {
      console.log(`🚫 BLOCKED: User ${userId} is too close to limit (${currentCycleTotal}/${limit})`);
      return NextResponse.json({ 
        error: "REQUEST DENIED - Approaching billing cycle limit",
        details: `You have used ${currentCycleTotal.toLocaleString()} tokens out of ${limit.toLocaleString()} allowed. Please upgrade your plan to continue.`,
        status: "blocked",
        current_usage: currentCycleTotal,
        limit: limit
      }, { status: 402 });
    }

    console.log(`✅ User ${userId} passed limit check, proceeding with request`);

    // Generate unique request ID to prevent duplicates
    const requestId = `${apiKey.slice(0, 10)}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create a unique hash of the request content for additional deduplication
    const requestHash = Buffer.from(JSON.stringify({ model, messages, provider })).toString('base64').slice(0, 16);
    const fullRequestId = `${requestId}_${requestHash}`;

    console.log(`🚀 Processing chat request: ${fullRequestId}`);

    // Route request
    let endpoint: string;
    if (provider === "google") {
      const m = encodeURIComponent(model);
      const apiKey = encodeURIComponent(process.env.GEMINI_API_KEY ?? "");
      endpoint = `${GOOGLE_BASE}/models/${m}:generateContent?key=${apiKey}`;
    } else {
      endpoint = PROVIDER_ENDPOINTS[provider as Exclude<Provider, "google">];
    }

    const headers: Record<string, string> = { "content-type": "application/json" };
    if (provider === "openai") headers.Authorization = `Bearer ${process.env.OPENAI_API_KEY ?? ""}`;
    if (provider === "anthropic") {
      headers["x-api-key"] = process.env.ANTHROPIC_API_KEY ?? "";
      headers["anthropic-version"] = "2023-06-01";
    }

    const providerPayload = buildProviderPayload(provider as Provider, model, messages);
    const upstream = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(providerPayload),
    });

    const result = await upstream.json();

    // Extract completion tokens (output only) from response
    let completionTokens = 0;
    let promptTokens = 0;
    if (provider === "openai" && result.usage) {
      completionTokens = result.usage.completion_tokens || 0;
      promptTokens = result.usage.prompt_tokens || 0;
    } else if (provider === "anthropic" && result.usage) {
      completionTokens = result.usage.output_tokens || 0;
      promptTokens = result.usage.input_tokens || 0;
    } else if (provider === "google" && result.usageMetadata) {
      completionTokens = result.usageMetadata.candidatesTokenCount || 0;
      promptTokens = result.usageMetadata.promptTokenCount || 0;
    }

    console.log(`Chat API usage for ${provider}/${model}:`, {
      prompt: promptTokens,
      completion: completionTokens,
      total: promptTokens + completionTokens,
      userId,
      timestamp
    });

    // Check limits after getting actual token count
            if (currentCycleTotal + (promptTokens + completionTokens) > limit) {
      return NextResponse.json({ error: "Token limit exceeded" }, { status: 402 });
    }

    // Record detailed usage with timestamp
    const { error: insertError } = await supabaseAdmin
      .from("usage_details")
      .insert({
        user_id: userId,
        timestamp,
        provider,
        model,
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: promptTokens + completionTokens,
        charged_tokens: promptTokens + completionTokens, // Charge for total tokens (input + output)
        request_id: fullRequestId // Use full request ID for deduplication
      });

    if (insertError) {
      console.error("❌ Failed to record usage:", insertError);
    } else {
      console.log(`✅ Successfully recorded ${promptTokens + completionTokens} total tokens for user ${userId} (request: ${fullRequestId})`);
      
      // Update monthly usage
      const { error: updateError } = await supabaseAdmin.rpc("update_monthly_usage_and_check_limit", {
        p_user_id: userId,
        p_tokens_to_add: promptTokens + completionTokens
      });
      
      if (updateError) {
        console.error("❌ Failed to update total tokens:", updateError);
      }
    }

    return NextResponse.json({ 
      provider, 
      model, 
      result,
      usage: {
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: promptTokens + completionTokens,
        charged_tokens: promptTokens + completionTokens,
        timestamp
      }
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    return NextResponse.json({ error: "Chat API error", details: message }, { status: 500 });
  }
}

type OpenAIMessage = { role: string; content: string };

function buildProviderPayload(provider: Provider, model: string, messages: OpenAIMessage[]) {
  if (provider === "openai") {
    return { model, messages };
  }
  if (provider === "anthropic") {
    const system = messages.find((m) => m.role === "system")?.content ?? undefined;
    const rest = messages.filter((m) => m.role !== "system").map((m) => ({ role: m.role, content: m.content }));
    return { model, system, messages: rest, max_tokens: 1024 };
  }
  if (provider === "google") {
    const contents = messages.map((m) => ({ role: m.role, parts: [{ text: m.content }] }));
    return { contents };
  }
  return { model, messages };
}

function resolveProviderFromModel(model: string): Provider | undefined {
  const m = model.toLowerCase();
  const map: Record<string, Provider> = {
    "gpt-5": "openai",
    "claude-4.1-opus": "anthropic",
    "gemini-2.5-pro": "google",
  };
  if (map[m]) return map[m];
  if (m.startsWith("gpt-")) return "openai";
  if (m.startsWith("claude")) return "anthropic";
  if (m.startsWith("gemini")) return "google";
  return undefined;
}
