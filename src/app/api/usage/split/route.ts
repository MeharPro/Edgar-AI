import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { ensureUserByEmail } from "@/lib/ensureUser";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await ensureUserByEmail(session.user.email);
  if (!user) return NextResponse.json({ split: [] });

  // Get all usage for provider split (not just this month)
  const { data } = await supabaseAdmin
    .from("usage_details")
    .select("provider, charged_tokens")
    .eq("user_id", user.id)
    .gt("charged_tokens", 0); // Only include actual usage

  // Group by provider and sum tokens
  const providerTotals = new Map<string, number>();
  (data || []).forEach((row) => {
    const current = providerTotals.get(row.provider) || 0;
    providerTotals.set(row.provider, current + (row.charged_tokens || 0));
  });

  const total = Array.from(providerTotals.values()).reduce((s, tokens) => s + tokens, 0);
  const split = Array.from(providerTotals.entries()).map(([provider, tokens]) => ({
    provider,
    percent: total > 0 ? Math.round((tokens / total) * 100) : 0,
  }));

  return NextResponse.json({ split, total });
}


