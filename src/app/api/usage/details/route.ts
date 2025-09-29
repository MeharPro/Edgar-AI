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
  const rawRollover = Number((userRow as { rollover_tokens?: number })?.rollover_tokens || 0);
  const rolloverTokens = plan === 'starter' ? 0 : rawRollover;

  // Get recent usage (last 100 calls) for the table
  const { data: details } = await supabaseAdmin
    .from("usage_details")
    .select("*")
    .eq("user_id", user.id)
    .order("timestamp", { ascending: false })
    .limit(100);

  // Get current billing cycle window (SQL authoritative)
  const { data: windowData } = await supabaseAdmin.rpc("get_billing_cycle_window", {
    p_user_id: user.id
  });
  const currentCycleStart = new Date((windowData as { cycle_start: string })?.cycle_start || new Date().toISOString());
  const currentCycleEnd = new Date((windowData as { cycle_end: string })?.cycle_end || new Date(Date.now() + 30 * 86400_000).toISOString());
  const billingChargeDate = new Date(currentCycleEnd);
  
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
