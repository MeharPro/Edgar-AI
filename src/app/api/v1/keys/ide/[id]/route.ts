import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { ensureUserByEmail } from "@/lib/ensureUser";
import { authHeaderToBearer, verifyProviderIdToken, jsonError } from "@/lib/idToken";

export const runtime = "nodejs";

export async function DELETE(req: Request) {
  try {
    const token = authHeaderToBearer(req);
    if (!token) return jsonError("Missing Authorization Bearer token", 401);
    const identity = await verifyProviderIdToken(token);
    const email = identity.email;
    if (!email) return jsonError("Email not found in id_token", 401);

    const ensured = await ensureUserByEmail(email);
    const userId = ensured?.id as string | undefined;
    if (!userId) return jsonError("Unable to ensure user", 500);

    // Extract key id from URL path to avoid Next.js type friction on context
    const { pathname } = new URL(req.url);
    const segments = pathname.split('/');
    const keyId = segments[segments.length - 1] || segments[segments.length - 2];

    // Ensure key belongs to user
    const { data: row } = await supabaseAdmin
      .from("api_keys")
      .select("id")
      .eq("id", keyId)
      .eq("user_id", userId)
      .single();
    if (!row) return jsonError("Not found", 404);

    // Prefer soft revoke (revoked_at), fallback to delete
    type KeyUpdate = { revoked_at: string };
    const { error: revokeErr } = await supabaseAdmin
      .from("api_keys")
      .update({ revoked_at: new Date().toISOString() } as KeyUpdate)
      .eq("id", keyId);
    if (revokeErr) {
      await supabaseAdmin.from("api_keys").delete().eq("id", keyId);
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return jsonError(`Delete key error: ${msg}`, 401);
  }
}
