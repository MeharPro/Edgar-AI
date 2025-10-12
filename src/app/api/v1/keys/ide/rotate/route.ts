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
    const identity = await verifyProviderIdToken(token);
    const email = identity.email;
    if (!email) return jsonError("Email not found in id_token", 401);

    const ensured = await ensureUserByEmail(email);
    const userId = ensured?.id as string | undefined;
    if (!userId) return jsonError("Unable to ensure user", 500);

    // Fetch the latest key (for revocation)
    const { data: latest } = await supabaseAdmin
      .from("api_keys")
      .select("id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1);
    const prevId = latest?.[0]?.id as string | undefined;

    const apiKey = generateProviderApiKey();
    const hash = await bcrypt.hash(apiKey, 10);
    const prefix = apiKey.slice(0, 10);

    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from("api_keys")
      .insert({ user_id: userId, hash, prefix })
      .select("id")
      .single();
    if (insertErr) {
      console.error("Insert api_keys failed:", insertErr.message);
      return jsonError("Failed to issue key", 500);
    }

    // Revoke previous key: prefer setting revoked_at, fallback to delete if column missing
    if (prevId) {
      const { error: revokeErr } = await supabaseAdmin
        .from("api_keys")
        .update({ revoked_at: new Date().toISOString() } as any)
        .eq("id", prevId);
      if (revokeErr) {
        // If update fails (column might not exist), attempt delete to ensure rotation semantics
        await supabaseAdmin.from("api_keys").delete().eq("id", prevId);
      }
    }

    return NextResponse.json({ api_key: apiKey, id: inserted.id }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return jsonError(`Rotate key error: ${msg}`, 401);
  }
}

