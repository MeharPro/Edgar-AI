import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ensureUserByEmail } from "@/lib/ensureUser";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const enabled = Boolean(body?.enabled);
  const user = await ensureUserByEmail(session.user.email);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  const { error } = await supabaseAdmin
    .from("users")
    .update({ leaderboard_opt_in: enabled })
    .eq("id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("leaderboard_opt_in")
    .eq("email", session.user.email)
    .single();
  if (error && error.code !== "PGRST116") return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ enabled: Boolean(data?.leaderboard_opt_in) });
}


