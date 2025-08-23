import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin (you can modify this logic)
    const user = await supabaseAdmin
      .from("users")
      .select("email")
      .eq("email", session.user.email)
      .single();

    if (!user.data || user.data.email !== "meharkhanna@gmail.com") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { userId } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    // Get user's Stripe customer ID
    const { data: userData } = await supabaseAdmin
      .from("users")
      .select("stripe_customer_id, subscription_id")
      .eq("id", userId)
      .single();

    if (!userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!userData.stripe_customer_id && !userData.subscription_id) {
      return NextResponse.json({ error: "No Stripe data found for user" }, { status: 404 });
    }

    // Fetch from Stripe API
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
    }

    let subscriptionData = null;

    if (userData.subscription_id) {
      // Fetch by subscription ID
      const response = await fetch(`https://api.stripe.com/v1/subscriptions/${userData.subscription_id}`, {
        headers: {
          Authorization: `Bearer ${stripeSecretKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      if (response.ok) {
        subscriptionData = await response.json();
      }
    } else if (userData.stripe_customer_id) {
      // Fetch by customer ID
      const response = await fetch(`https://api.stripe.com/v1/customers/${userData.stripe_customer_id}/subscriptions`, {
        headers: {
          Authorization: `Bearer ${stripeSecretKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      if (response.ok) {
        const subscriptions = await response.json();
        subscriptionData = subscriptions.data[0]; // Get the most recent subscription
      }
    }

    if (!subscriptionData) {
      return NextResponse.json({ error: "No subscription found in Stripe" }, { status: 404 });
    }

    // Update user data
    const price = subscriptionData.items.data[0].price;
    const plan = price.nickname?.toLowerCase().includes("max") ? "max" : "pro";

    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update({
        stripe_customer_id: subscriptionData.customer,
        subscription_id: subscriptionData.id,
        plan: plan,
        subscription_status: subscriptionData.status,
        current_period_start: new Date(subscriptionData.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscriptionData.current_period_end * 1000).toISOString(),
      })
      .eq("id", userId);

    if (updateError) {
      console.error("Error updating user:", updateError);
      return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "User subscription data updated from Stripe",
      subscription: {
        id: subscriptionData.id,
        status: subscriptionData.status,
        plan: plan,
        current_period_end: new Date(subscriptionData.current_period_end * 1000).toISOString(),
      },
    });

  } catch (error) {
    console.error("Resync error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
