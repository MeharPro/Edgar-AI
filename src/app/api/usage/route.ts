import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { ensureUserByEmail } from "@/lib/ensureUser";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await ensureUserByEmail(session.user.email);
    if (!user) return NextResponse.json({ tokens: 0, plan: "starter" });

  // Get current billing cycle window from SQL
  let currentCycleStart: Date;
  let currentCycleEnd: Date;
  try {
    const { data: windowData } = await supabaseAdmin.rpc("get_billing_cycle_window", {
      p_user_id: user.id
    });
    const windowRow = Array.isArray(windowData) ? windowData[0] : (windowData as any);
    currentCycleStart = new Date((windowRow?.cycle_start as string) || new Date().toISOString());
    currentCycleEnd = new Date((windowRow?.cycle_end as string) || new Date(Date.now() + 30 * 86400_000).toISOString());
  } catch (error) {
    console.error('Error getting billing cycle window:', error);
    // Fallback: use user's billing_cycle_start → +1 month
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('billing_cycle_start')
      .eq('id', user.id)
      .single();
    currentCycleStart = new Date(userData?.billing_cycle_start || new Date());
    currentCycleEnd = new Date(currentCycleStart);
    currentCycleEnd.setMonth(currentCycleEnd.getMonth() + 1);
  }
  
  const { data: details } = await supabaseAdmin
    .from("usage_details")
    .select("charged_tokens")
    .eq("user_id", user.id)
    .gte("timestamp", currentCycleStart.toISOString())
    .lt("timestamp", currentCycleEnd.toISOString());

    const totalTokens = details?.reduce((sum, row) => sum + (row.charged_tokens || 0), 0) || 0;

    return NextResponse.json({ tokens: totalTokens, plan: user.plan || "starter" });
  } catch (error) {
    console.error('Error in usage API:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
