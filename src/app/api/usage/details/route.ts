import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { ensureUserByEmail } from "@/lib/ensureUser";
import { authOptions } from "@/lib/auth";
import { PLAN_LIMITS } from "@/lib/tokens";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await ensureUserByEmail(session.user.email);
  if (!user) return NextResponse.json({ details: [] });

  // Ensure rollover is applied for this cycle (idempotent)
  try {
    await supabaseAdmin.rpc("apply_token_rollover", { p_user_id: user.id });
  } catch (e) {
    console.warn("apply_token_rollover unavailable:", e);
  }

  // Fetch plan + rollover from users table
  const { data: userRow } = await supabaseAdmin
    .from('users')
    .select('plan, rollover_tokens')
    .eq('id', user.id)
    .single();
  const plan = (userRow?.plan || 'starter') as keyof typeof PLAN_LIMITS;
  const baseLimit = PLAN_LIMITS[plan];
  const rolloverTokens = Number((userRow as { rollover_tokens?: number })?.rollover_tokens || 0);

  // Get recent usage (last 100 calls) for the table
  const { data: details } = await supabaseAdmin
    .from("usage_details")
    .select("*")
    .eq("user_id", user.id)
    .order("timestamp", { ascending: false })
    .limit(100);

  // Get current billing cycle start
  const { data: billingCycleStart } = await supabaseAdmin.rpc("get_current_billing_cycle_start", {
    p_user_id: user.id
  });
  
  const currentCycleStart = new Date(billingCycleStart);
  const currentCycleEnd = new Date(currentCycleStart);
  currentCycleEnd.setMonth(currentCycleEnd.getMonth() + 1);
  
  // Calculate billing charge date (next month)
  const billingChargeDate = new Date(currentCycleStart);
  billingChargeDate.setMonth(billingChargeDate.getMonth() + 1);
  
  const currentCycleDetails = details?.filter(row => 
    new Date(row.timestamp) >= currentCycleStart && 
    new Date(row.timestamp) < currentCycleEnd
  ) || [];

  const usedThisCycle = currentCycleDetails.reduce((sum, row) => sum + (row.charged_tokens || 0), 0);
  const effectiveLimit = baseLimit + rolloverTokens;
  const remaining = Math.max(effectiveLimit - usedThisCycle, 0);

  const summary = {
    total_calls: currentCycleDetails.length,
    total_charged: usedThisCycle,
    total_prompt: currentCycleDetails.reduce((sum, row) => sum + (row.prompt_tokens || 0), 0),
    total_completion: currentCycleDetails.reduce((sum, row) => sum + (row.completion_tokens || 0), 0),
    billing_cycle_start: currentCycleStart.toISOString(),
    billing_charge_date: billingChargeDate.toISOString(),
    base_limit: baseLimit,
    rollover_tokens: rolloverTokens,
    effective_limit: effectiveLimit,
    remaining_tokens: remaining,
  } as const;

  return NextResponse.json({ 
    details: details || [],
    summary: summary
  });
}
