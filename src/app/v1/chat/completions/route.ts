import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import bcrypt from "bcryptjs";
import { PLAN_LIMITS } from "@/lib/tokens";

type Provider = "openai" | "anthropic" | "google";

interface ChatMessage {
  role: string;
  content: string;
}

interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  max_tokens?: number;
  temperature?: number;
  stream?: boolean;
}

const PROVIDER_ENDPOINTS: Record<Exclude<Provider, "google">, string> = {
  openai: "https://api.openai.com/v1/chat/completions",
  anthropic: "https://api.anthropic.com/v1/messages",
};
const GOOGLE_BASE = "https://generativelanguage.googleapis.com/v1beta";

// In-memory cache to prevent duplicate requests
const requestCache = new Map<string, { timestamp: number; response: Record<string, unknown> }>();

export async function POST(req: NextRequest) {
  try {
    console.log("🚀 /v1/chat/completions endpoint called");
    
    const apiKey = req.headers.get("authorization")?.replace("Bearer ", "") || "";
    if (!apiKey.startsWith("edgar_")) {
      return NextResponse.json({ error: "Missing or invalid API key" }, { status: 401 });
    }

    const body: ChatCompletionRequest = await req.json();
    const model: string | undefined = body?.model;
    const messages: ChatMessage[] | undefined = body?.messages;
    const max_tokens: number | undefined = body?.max_tokens;
    const temperature: number | undefined = body?.temperature;

    if (!model || !messages) {
      return NextResponse.json({ error: "model and messages are required" }, { status: 400 });
    }

    console.log(`🔍 Request details: model=${model}, messages=${messages.length}`);

    // Generate unique request ID to prevent duplicates
    const requestId = `${apiKey.slice(0, 10)}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create a unique hash of the request content for additional deduplication
    const requestHash = Buffer.from(JSON.stringify({ model, messages, max_tokens, temperature })).toString('base64').slice(0, 16);
    const fullRequestId = `${requestId}_${requestHash}`;

    console.log(`🚀 Processing request: ${fullRequestId}`);

    // Check in-memory cache for recent duplicate requests
    const now = Date.now();
    const cacheKey = `${apiKey.slice(0, 10)}_${requestHash}`;
    const cached = requestCache.get(cacheKey);
    
    if (cached && (now - cached.timestamp) < 5000) {
      console.log(`🛑 Duplicate request detected in memory cache: ${fullRequestId}`);
      return NextResponse.json(cached.response);
    }

    // Validate API key
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

    // Apply rollover for this user's new cycle (idempotent in SQL)
    try {
      await supabaseAdmin.rpc("apply_token_rollover", { p_user_id: userId });
    } catch (e) {
      console.warn("⚠️ apply_token_rollover failed or unavailable:", e);
    }

    // Check plan and rollover before processing
    const { data: user } = await supabaseAdmin
      .from("users")
      .select("plan, rollover_tokens")
      .eq("id", userId)
      .single();
    const plan = (user?.plan || "starter") as keyof typeof PLAN_LIMITS;
    const baseLimit = PLAN_LIMITS[plan];
    const rolloverTokens = Number((user as { rollover_tokens?: number })?.rollover_tokens || 0);
    const effectiveLimit = baseLimit + rolloverTokens;

    console.log(`🔍 User plan: ${plan}, base: ${baseLimit}, rollover: ${rolloverTokens}, effective: ${effectiveLimit}`);

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
      baseLimit,
      rolloverTokens,
      effectiveLimit,
      currentCycleTotal,
      wouldExceed: currentCycleTotal >= effectiveLimit,
      cycleUsageCount: cycleUsage?.length || 0
    });

    // STRICT: Check if this request would exceed the billing cycle limit
          if (currentCycleTotal >= effectiveLimit) {
      console.log(`🚫 BLOCKED: User ${userId} has exceeded limit (${currentCycleTotal}/${effectiveLimit})`);
      return NextResponse.json({ 
        error: "REQUEST DENIED - Billing cycle limit exceeded",
        details: `You have used ${currentCycleTotal.toLocaleString()} tokens out of ${effectiveLimit.toLocaleString()} allowed (includes rollover). Please upgrade your plan to continue.`,
        status: "blocked",
        current_usage: currentCycleTotal,
        limit: effectiveLimit,
        base_limit: baseLimit,
        rollover: rolloverTokens
      }, { status: 402 });
    }

    // ADDITIONAL SAFETY: Block if they're very close to the limit (within 100 tokens)
            if (currentCycleTotal >= (effectiveLimit - 100)) {
      console.log(`🚫 BLOCKED: User ${userId} is too close to limit (${currentCycleTotal}/${effectiveLimit})`);
      return NextResponse.json({ 
        error: "REQUEST DENIED - Approaching billing cycle limit",
        details: `You have used ${currentCycleTotal.toLocaleString()} tokens out of ${effectiveLimit.toLocaleString()} allowed (includes rollover). Please upgrade your plan to continue.`,
        status: "blocked",
        current_usage: currentCycleTotal,
        limit: effectiveLimit,
        base_limit: baseLimit,
        rollover: rolloverTokens
      }, { status: 402 });
    }

    console.log(`✅ User ${userId} passed limit check, proceeding with request`);

    // Determine provider from model
    let provider: Provider;
    const modelLower = model.toLowerCase();
    if (modelLower.startsWith("gpt-")) {
      provider = "openai";
    } else if (modelLower.startsWith("claude")) {
      provider = "anthropic";
    } else if (modelLower.startsWith("gemini")) {
      provider = "google";
    } else {
      return NextResponse.json({ error: "Unsupported model" }, { status: 400 });
    }

    // Route request
    let endpoint: string;
    let providerPayload: Record<string, unknown>;

    if (provider === "openai") {
      endpoint = PROVIDER_ENDPOINTS.openai;
      providerPayload = {
        model,
        messages,
        max_tokens,
        temperature,
        stream: false // We don't support streaming yet
      };
    } else if (provider === "anthropic") {
      endpoint = PROVIDER_ENDPOINTS.anthropic;
      const system = messages.find((m: ChatMessage) => m.role === "system")?.content;
      const rest = messages.filter((m: ChatMessage) => m.role !== "system");
      providerPayload = {
        model,
        system,
        messages: rest,
        max_tokens: max_tokens || 1024
      };
    } else if (provider === "google") {
      const m = encodeURIComponent(model);
      const apiKey = encodeURIComponent(process.env.GEMINI_API_KEY ?? "");
      endpoint = `${GOOGLE_BASE}/models/${m}:generateContent?key=${apiKey}`;
      providerPayload = {
        contents: messages.map((m: ChatMessage) => ({ role: m.role, parts: [{ text: m.content }] }))
      };
    } else {
      return NextResponse.json({ error: "Unsupported provider" }, { status: 400 });
    }

    // Set headers
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (provider === "openai") headers.Authorization = `Bearer ${process.env.OPENAI_API_KEY ?? ""}`;
    if (provider === "anthropic") {
      headers["x-api-key"] = process.env.ANTHROPIC_API_KEY ?? "";
      headers["anthropic-version"] = "2023-06-01";
    }

    // Make request
    console.log(`🔍 Sending to upstream:`, {
      endpoint,
      payload: providerPayload,
      headers: Object.keys(headers)
    });

    const upstream = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(providerPayload),
    });

    const result = await upstream.json();

    console.log(`🔍 Upstream response:`, {
      status: upstream.status,
      usage: (result as any).usage,
      choices: (result as any).choices?.length || 0,
      content: (result as any).choices?.[0]?.message?.content?.substring(0, 100) || 'No content'
    });

    // Extract completion tokens (output only) from response
    let completionTokens = 0;
    let promptTokens = 0;
    if (provider === "openai" && (result as any).usage) {
      completionTokens = (result as any).usage.completion_tokens || 0;
      promptTokens = (result as any).usage.prompt_tokens || 0;
    } else if (provider === "anthropic" && (result as any).usage) {
      completionTokens = (result as any).usage.output_tokens || 0;
      promptTokens = (result as any).usage.input_tokens || 0;
    } else if (provider === "google" && (result as any).usageMetadata) {
      completionTokens = (result as any).usageMetadata.candidatesTokenCount || 0;
      promptTokens = (result as any).usageMetadata.promptTokenCount || 0;
    }

    console.log(`OpenAI-compatible API usage for ${provider}/${model}:`, {
      prompt: promptTokens,
      completion: completionTokens,
      total: promptTokens + completionTokens,
      userId,
      timestamp
    });

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
      
      // Update monthly usage (billing-cycle aware)
      const { error: updateError } = await supabaseAdmin.rpc("update_monthly_usage_and_check_limit", {
        p_user_id: userId,
        p_tokens_to_add: promptTokens + completionTokens
      });
      
      if (updateError) {
        console.error("❌ Failed to update total tokens:", updateError);
      }
    }

    // Add to cache
    requestCache.set(cacheKey, { timestamp: now, response: result });

    // Return OpenAI-compatible response
    if (provider === "openai") {
      // OpenAI response is already in the right format
      return NextResponse.json(result);
    } else if (provider === "anthropic") {
      // Convert Anthropic response to OpenAI format
      return NextResponse.json({
        id: `chatcmpl-${Date.now()}`,
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model,
        choices: [{
          index: 0,
          message: {
            role: "assistant",
            content: (result as any).content?.[0]?.text || ""
          },
          finish_reason: "stop"
        }],
        usage: {
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          total_tokens: promptTokens + completionTokens
        }
      });
    } else if (provider === "google") {
      // Convert Google response to OpenAI format
      return NextResponse.json({
        id: `chatcmpl-${Date.now()}`,
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model,
        choices: [{
          index: 0,
          message: {
            role: "assistant",
            content: (result as any).candidates?.[0]?.content?.parts?.[0]?.text || ""
          },
          finish_reason: "stop"
        }],
        usage: {
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          total_tokens: promptTokens + completionTokens
        }
      });
    }

    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    return NextResponse.json({ error: "OpenAI-compatible API error", details: message }, { status: 500 });
  }
}
