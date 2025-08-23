import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import Stripe from 'stripe';

export const runtime = 'nodejs';

export async function POST() {
  try {
    console.log('create-portal-session: Starting request');
    
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      console.log('create-portal-session: Unauthorized - no session');
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log('create-portal-session: User authenticated:', session.user.email);

    // Get user's Stripe customer ID from database
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, stripe_customer_id, plan, subscription_status')
      .eq('email', session.user.email)
      .single();

    if (error || !user) {
      console.log('create-portal-session: User not found in database');
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    console.log('create-portal-session: User found:', {
      id: user.id,
      plan: user.plan,
      subscription_status: user.subscription_status,
      has_stripe_customer_id: !!user.stripe_customer_id
    });

    // Only allow Pro and Max users with active subscriptions
    if (user.plan === 'starter' || !['active', 'trialing'].includes(user.subscription_status || '')) {
      console.log('create-portal-session: No active subscription', {
        plan: user.plan,
        subscription_status: user.subscription_status
      });
      return NextResponse.json({ error: "No active subscription" }, { status: 400 });
    }

    if (!user.stripe_customer_id) {
      console.log('create-portal-session: No stripe_customer_id on file');
      return NextResponse.json({ 
        error: "No stripe_customer_id on file. Wait a minute or re-open billing." 
      }, { status: 409 });
    }

    console.log('create-portal-session: Validating customer with Stripe:', user.stripe_customer_id);

    // Check if Stripe secret key is configured
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('create-portal-session: STRIPE_SECRET_KEY not configured');
      return NextResponse.json({ 
        error: "Stripe configuration missing" 
      }, { status: 500 });
    }

    // Create Stripe Customer Portal session
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-07-30.basil',
    });

    // Sanity: ensure the customer exists in this Stripe account + mode
    try {
      const customer = await stripe.customers.retrieve(user.stripe_customer_id);
      
      // Check if customer is deleted
      if (customer.deleted) {
        console.error('create-portal-session: Customer is deleted:', user.stripe_customer_id);
        return NextResponse.json({ 
          error: "Customer has been deleted in Stripe." 
        }, { status: 422 });
      }
      
      console.log('create-portal-session: Customer validated:', {
        customer_id: customer.id,
        customer_email: customer.email
      });
    } catch (stripeError: unknown) {
      const errorCode = stripeError && typeof stripeError === 'object' && 'code' in stripeError 
        ? (stripeError as { code: string }).code 
        : 'unknown';
      const errorMessage = stripeError && typeof stripeError === 'object' && 'message' in stripeError 
        ? (stripeError as { message: string }).message 
        : 'Unknown error';
      
      console.error('create-portal-session: stripe.customer.retrieve failed', {
        customer_id: user.stripe_customer_id,
        error_code: errorCode,
        error_message: errorMessage
      });
      return NextResponse.json({ 
        error: "Customer not found in current Stripe environment. Check test/live mode." 
      }, { status: 422 });
    }
    
    const returnUrl = `https://edgar.daybot.ca/dashboard?t=${Date.now()}`;
    console.log('create-portal-session: Creating portal session with return URL:', returnUrl);
    
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: returnUrl,
    });

    console.log('create-portal-session: Portal session created successfully', {
      user_id: user.id,
      customer_id: user.stripe_customer_id,
      portal_url: portalSession.url
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error('create-portal-session: Unexpected error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
