import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'lifetime'; // lifetime or monthly

  // Get users who have opted into leaderboard
  const { data: users } = await supabaseAdmin
    .from("users")
    .select("id, name, email, leaderboard_opt_in")
    .eq("leaderboard_opt_in", true);

  if (!users || users.length === 0) {
    return NextResponse.json({ data: [] });
  }

  const userIds = users.map(u => u.id);

  // Get usage data based on type
  let usageQuery = supabaseAdmin
    .from("usage_details")
    .select("user_id, charged_tokens");

  if (type === 'monthly') {
    // Month-to-date using UTC month boundaries to avoid TZ drift
    const now = new Date();
    const monthStartUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));
    const nextMonthStartUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0));

    usageQuery = usageQuery
      .gte("timestamp", monthStartUTC.toISOString())
      .lt("timestamp", nextMonthStartUTC.toISOString());
  }

  const { data: usage } = await usageQuery.in("user_id", userIds);

  // Calculate tokens by user
  const tokensByUser: Record<string, number> = {};
  for (const row of usage || []) {
    const userId = row.user_id as string;
    tokensByUser[userId] = (tokensByUser[userId] || 0) + Number(row.charged_tokens || 0);
  }

  // Create leaderboard entries
  const leaderboard = users
    .map(user => ({
      id: user.id,
      name: user.name || user.email?.split('@')[0] || 'Anonymous',
      email: user.email,
      tokens: tokensByUser[user.id] || 0
    }))
    .filter(entry => entry.tokens > 0) // Only show users with usage
    .sort((a, b) => b.tokens - a.tokens) // Sort by tokens descending
    .slice(0, 50); // Limit to top 50

  return NextResponse.json({ data: leaderboard });
}

