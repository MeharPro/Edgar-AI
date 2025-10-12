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
    
    // Optional label support
    let label: string | null = null;
    try {
      const body = await req.json();
      if (body && typeof body.label === 'string' && body.label.trim().length > 0) {
        label = body.label.trim().slice(0, 100);
      }
    } catch {}

    const apiKey = generateProviderApiKey();
    const hash = await bcrypt.hash(apiKey, 10);
    const prefix = apiKey.slice(0, 10);

    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from("api_keys")
      .insert({ user_id: userId, hash, prefix, label })
      .select("id, label")
      .single();
    if (insertErr) {
      console.error("Insert api_keys failed:", insertErr.message);
      return jsonError("Failed to issue key", 500);
    }

    return NextResponse.json({ api_key: apiKey, id: inserted.id, label: inserted.label ?? null, created: true }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return jsonError(`Key issuance error: ${msg}`, 401);
  }
}

export async function GET(req: Request) {
  try {
    const token = authHeaderToBearer(req);
    if (!token) return jsonError("Missing Authorization Bearer token", 401);
    const identity = await verifyProviderIdToken(token);
    const email = identity.email;
    if (!email) return jsonError("Email not found in id_token", 401);
    const ensured = await ensureUserByEmail(email);
    const userId = ensured?.id as string | undefined;
    if (!userId) return jsonError("Unable to ensure user", 500);

    const { data, error } = await supabaseAdmin
      .from("api_keys")
      .select("id, label, created_at, revoked_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("api_keys list failed:", error.message);
      return jsonError("Failed to list keys", 500);
    }
    type KeyListRow = { id: string; label: string | null; created_at: string; revoked_at: string | null };
    const rows: KeyListRow[] = Array.isArray(data) ? (data as unknown as KeyListRow[]) : [];
    const items = rows.map((r) => ({
      id: r.id,
      label: r.label,
      createdAt: r.created_at,
      revoked: !!r.revoked_at,
    }));
    return NextResponse.json({ keys: items });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return jsonError(`List keys error: ${msg}`, 401);
  }
}
