import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { ensureUserByEmail } from "@/lib/ensureUser";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await ensureUserByEmail(session.user.email);
  if (!user) return NextResponse.json({ tokens: 0, plan: "starter" });

  // Get current billing cycle usage
  const { data: billingCycleStart } = await supabaseAdmin.rpc("get_current_billing_cycle_start", {
    p_user_id: user.id
  });
  
  const currentCycleStart = billingCycleStart;
  const currentCycleEnd = new Date(currentCycleStart);
  currentCycleEnd.setDate(currentCycleEnd.getDate() + 30.5);
  
  const { data: details } = await supabaseAdmin
    .from("usage_details")
    .select("charged_tokens")
    .eq("user_id", user.id)
    .gte("timestamp", currentCycleStart.toISOString())
    .lt("timestamp", currentCycleEnd.toISOString());

  const totalTokens = details?.reduce((sum, row) => sum + (row.charged_tokens || 0), 0) || 0;

  return NextResponse.json({ tokens: totalTokens, plan: user.plan || "starter" });
}


