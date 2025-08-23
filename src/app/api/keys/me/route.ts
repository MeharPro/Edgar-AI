import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { maskKey } from "@/lib/keys";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: user } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("email", session.user.email)
    .single();

  if (!user) return NextResponse.json({ apiKeyMasked: null });

  const { data: keys } = await supabaseAdmin
    .from("api_keys")
    .select("prefix, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1);

  if (!keys || keys.length === 0) return NextResponse.json({ apiKeyMasked: null });

  // We can't retrieve plain key. Return placeholder mask.
  // We only return a masked placeholder to indicate a key exists
  return NextResponse.json({ apiKeyMasked: maskKey(`${keys[0].prefix}************************`) });
}


