import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { ensureUserByEmail } from "@/lib/ensureUser";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await ensureUserByEmail(session.user.email);
  if (!user) return NextResponse.json({ data: [] });

  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') || 'week'; // hour, day, week, month, ytd, year

  // Calculate date range based on period
  const now = new Date();
  let startDate: Date;
  
  switch (period) {
    case 'hour':
      // Show the last full hour (e.g., if it's 2:30 PM, show 1:30 PM to 2:30 PM)
      startDate = new Date(now);
      startDate.setHours(now.getHours() - 1, 0, 0, 0); // Start of previous hour
      break;
    case 'day':
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case 'ytd':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    case 'year':
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }

  // Get usage data for the period
  const { data: usage } = await supabaseAdmin
    .from("usage_details")
    .select("timestamp, model, charged_tokens")
    .eq("user_id", user.id)
    .gte("timestamp", startDate.toISOString())
    .lte("timestamp", now.toISOString())
    .order("timestamp", { ascending: true });

  // Group data by time period and model
  const groupedData: Record<string, Record<string, number>> = {};
  
  usage?.forEach((row) => {
    const date = new Date(row.timestamp);
    const model = row.model as string;
    
    let timeKey: string;
    
    if (period === 'hour') {
      // Group by minute for hour view (show the full hour)
      timeKey = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    } else if (period === 'day') {
      // Group by hour for day view - use 12-hour format with proper timezone
      const hour = date.getHours();
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      timeKey = `${displayHour} ${ampm}`;
    } else if (period === 'week') {
      // Group by day for week view
      timeKey = date.toLocaleDateString('en-US', { 
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
    } else if (period === 'month') {
      // Group by day for month view
      timeKey = date.toLocaleDateString('en-US', { 
        month: 'short',
        day: 'numeric'
      });
    } else {
      // Group by month for longer periods
      timeKey = date.toLocaleDateString('en-US', { 
        month: 'short',
        year: 'numeric'
      });
    }
    
    if (!groupedData[timeKey]) {
      groupedData[timeKey] = {};
    }
    
    if (!groupedData[timeKey][model]) {
      groupedData[timeKey][model] = 0;
    }
    
    groupedData[timeKey][model] += Number(row.charged_tokens || 0);
  });

  // Convert to chart format and sort by time
  const chartData = Object.entries(groupedData)
    .map(([time, models]) => ({
      time,
      ...models
    }))
    .sort((a, b) => {
      // Sort by actual time for proper ordering
      if (period === 'hour' || period === 'day') {
        return a.time.localeCompare(b.time);
      } else {
        return new Date(a.time).getTime() - new Date(b.time).getTime();
      }
    });

  return NextResponse.json({ data: chartData });
}
