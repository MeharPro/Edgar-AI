import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { ensureUserByEmail } from "@/lib/ensureUser";
import { generateProviderApiKey } from "@/lib/keys";
import bcrypt from "bcryptjs";
import { authHeaderToBearer, verifyProviderIdToken, jsonError } from "@/lib/idToken";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const token = authHeaderToBearer(req);
    if (!token) return jsonError("Missing Authorization Bearer token", 401);

    // Verify provider id_token (Google supported)
    const identity = await verifyProviderIdToken(token);
    const email = identity.email;
    if (!email) return jsonError("Email not found in id_token", 401);

    const ensured = await ensureUserByEmail(email);
    const userId = ensured?.id as string | undefined;
    if (!userId) return jsonError("Unable to ensure user", 500);

    // If a key already exists for this user, do not return plaintext again
    const { data: existing, error: selectErr } = await supabaseAdmin
      .from("api_keys")
      .select("id")
      .eq("user_id", userId)
      .limit(1);
    if (selectErr) {
      console.error("api_keys select failed:", selectErr.message);
      return jsonError("Failed to check keys", 500);
    }
    if (existing && existing.length > 0) {
      return NextResponse.json({ created: false });
    }

    const apiKey = generateProviderApiKey();
    const hash = await bcrypt.hash(apiKey, 10);
    const prefix = apiKey.slice(0, 10);

    const { error: insertErr } = await supabaseAdmin
      .from("api_keys")
      .insert({ user_id: userId, hash, prefix });
    if (insertErr) {
      console.error("Insert api_keys failed:", insertErr.message);
      return jsonError("Failed to issue key", 500);
    }

    return NextResponse.json({ api_key: apiKey, created: true }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return jsonError(`Key issuance error: ${msg}`, 401);
  }
}

