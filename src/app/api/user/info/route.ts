import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ensureUserByEmail } from "@/lib/ensureUser";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await ensureUserByEmail(session.user.email);
  if (!user) return NextResponse.json({ plan: "starter", lifetime_usage: 0 });

  // Get lifetime usage from usage_details
  const { data: lifetimeUsage } = await supabaseAdmin
    .from("usage_details")
    .select("charged_tokens")
    .eq("user_id", user.id);
  const lifetimeTotal = lifetimeUsage?.reduce((sum, row) => sum + (row.charged_tokens || 0), 0) || 0;

  return NextResponse.json({ 
    plan: user.plan || "starter", 
    lifetime_usage: lifetimeTotal,
    subscription_status: user.subscription_status || "inactive",
    current_period_end: user.current_period_end || null,
    stripe_customer_id: user.stripe_customer_id || null
  });
}
