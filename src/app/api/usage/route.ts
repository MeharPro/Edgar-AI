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

  // Get current billing cycle usage
  let currentCycleStart;
  
  try {
    const { data: billingCycleStart } = await supabaseAdmin.rpc("get_current_billing_cycle_start", {
      p_user_id: user.id
    });
    currentCycleStart = billingCycleStart;
  } catch (error) {
    console.error('Error getting billing cycle start:', error);
    // Fallback: use user's billing_cycle_start or current date
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('billing_cycle_start')
      .eq('id', user.id)
      .single();
    
    currentCycleStart = userData?.billing_cycle_start || new Date();
  }
  
  const currentCycleEnd = new Date(currentCycleStart);
  currentCycleEnd.setMonth(currentCycleEnd.getMonth() + 1);
  
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

