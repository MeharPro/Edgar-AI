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

    // Get user's Stripe customer ID from database
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('stripe_customer_id, plan')
      .eq('email', session.user.email)
      .single();

    if (error || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Only allow Pro and Max users to access the portal
    if (user.plan === 'starter') {
      return NextResponse.json({ error: "No active subscription" }, { status: 400 });
    }

    if (!user.stripe_customer_id) {
      return NextResponse.json({ error: "No Stripe customer found" }, { status: 400 });
    }

    // Create Stripe Customer Portal session
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: `${process.env.NEXTAUTH_URL}/dashboard`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error('Error creating portal session:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
