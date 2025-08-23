import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { ensureUserByEmail } from "@/lib/ensureUser";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await ensureUserByEmail(session.user.email);
  if (!user) return NextResponse.json({ details: [] });

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
  currentCycleEnd.setDate(currentCycleEnd.getDate() + 30.5);
  
  // Calculate billing charge date (next month)
  const billingChargeDate = new Date(currentCycleStart);
  billingChargeDate.setMonth(billingChargeDate.getMonth() + 1);
  
  const currentCycleDetails = details?.filter(row => 
    new Date(row.timestamp) >= currentCycleStart && 
    new Date(row.timestamp) < currentCycleEnd
  ) || [];

  const summary = {
    total_calls: currentCycleDetails.length,
    total_charged: currentCycleDetails.reduce((sum, row) => sum + (row.charged_tokens || 0), 0),
    total_prompt: currentCycleDetails.reduce((sum, row) => sum + (row.prompt_tokens || 0), 0),
    total_completion: currentCycleDetails.reduce((sum, row) => sum + (row.completion_tokens || 0), 0),
    billing_cycle_start: currentCycleStart.toISOString(),
    billing_charge_date: billingChargeDate.toISOString()
  };

  return NextResponse.json({ 
    details: details || [],
    summary: summary
  });
}
