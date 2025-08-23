import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

// Utility functions
function toTimestamp(unix) {
  return new Date(unix * 1000).toISOString();
}

function inferPlanFromPaymentLinkUrl(session) {
  console.log('Inferring plan from session:', {
    recovery_url: session.after_expiration?.recovery?.url,
    success_url: session.success_url,
    cancel_url: session.cancel_url,
    metadata: session.metadata
  });
  
  // Check metadata first
  if (session.metadata?.plan) {
    console.log('Plan found in metadata:', session.metadata.plan);
    return session.metadata.plan;
  }
  
  // Check URLs
  const urls = [
    session.after_expiration?.recovery?.url,
    session.success_url,
    session.cancel_url
  ].filter(Boolean);
  
  for (const url of urls) {
    if (url.includes('Vy01')) {
      console.log('Plan inferred from URL (Vy01): pro');
      return 'pro';
    }
    if (url.includes('Vy02')) {
      console.log('Plan inferred from URL (Vy02): max');
      return 'max';
    }
  }
  
  // Check line items for price information
  if (session.line_items?.data?.[0]?.price?.nickname) {
    const nickname = session.line_items.data[0].price.nickname.toLowerCase();
    if (nickname.includes('pro')) {
      console.log('Plan inferred from price nickname (pro): pro');
      return 'pro';
    }
    if (nickname.includes('max')) {
      console.log('Plan inferred from price nickname (max): max');
      return 'max';
    }
  }
  
  console.log('No plan found, defaulting to pro');
  return 'pro'; // default fallback
}

function choosePlan(priceId, nickname) {
  // Map price IDs to plans if needed
  if (nickname) {
    const lowerNickname = nickname.toLowerCase();
    if (lowerNickname.includes('pro')) return 'pro';
    if (lowerNickname.includes('max')) return 'max';
  }
  
  // Default mapping based on common patterns
  if (priceId.includes('pro') || priceId.includes('20')) return 'pro';
  if (priceId.includes('max') || priceId.includes('100')) return 'max';
  
  return 'pro'; // default fallback
}

async function upsertUser(supabase, key, payload) {
  console.log(`Attempting to upsert user with key: ${key}`, payload);
  
  const { data: existingUser, error: selectError } = await supabase
    .from('users')
    .select('id, plan')
    .or(`id.eq.${key},email.eq.${key}`)
    .single();

  if (selectError) {
    console.error('Error finding user:', selectError);
    throw selectError;
  }

  console.log('Found existing user:', existingUser);

  if (existingUser) {
    // Update by user ID
    console.log(`Updating user ${existingUser.id} from plan ${existingUser.plan} to ${payload.plan}`);
    const { error } = await supabase
      .from('users')
      .update(payload)
      .eq('id', existingUser.id);
    
    if (error) {
      console.error('Error updating user:', error);
      throw error;
    }
    console.log(`Successfully updated user ${existingUser.id} with plan ${payload.plan}`);
  } else {
    // Try to find by email if key is not an email
    if (!key.includes('@')) {
      console.error('User not found and key is not an email:', key);
      return;
    }
    
    console.log(`Updating user by email: ${key} to plan ${payload.plan}`);
    const { error } = await supabase
      .from('users')
      .update(payload)
      .eq('email', key);
    
    if (error) {
      console.error('Error updating user by email:', error);
      throw error;
    }
    console.log(`Successfully updated user by email: ${key} with plan ${payload.plan}`);
  }
}

async function findByCustomer(supabase, customerId) {
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();
  
  return user?.id || null;
}

serve(async (req) => {
  console.log('Webhook received:', {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries())
  });

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify Stripe signature
    const signature = req.headers.get('stripe-signature');
    console.log('Stripe signature header:', signature);
    
    if (!signature) {
      console.error('Missing stripe-signature header');
      return new Response('Missing stripe-signature header', { status: 400, headers: corsHeaders });
    }

    const body = await req.text();
    console.log('Request body length:', body.length);
    
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET_SNAPSHOT');
    console.log('Webhook secret configured:', !!webhookSecret);
    
    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET_SNAPSHOT not configured');
      return new Response('Webhook secret not configured', { status: 500, headers: corsHeaders });
    }

    // Verify webhook signature using crypto
    try {
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(webhookSecret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign', 'verify']
      );

      const timestamp = signature.split(',')[0].split('=')[1];
      const signedPayload = `${timestamp}.${body}`;
      const expectedSignature = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload));
      const expectedSignatureHex = Array.from(new Uint8Array(expectedSignature))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      const receivedSignature = signature.split(',')[1].split('=')[1];
      
      console.log('Signature verification:', {
        timestamp,
        expectedSignatureHex: expectedSignatureHex.substring(0, 20) + '...',
        receivedSignature: receivedSignature.substring(0, 20) + '...',
        match: expectedSignatureHex === receivedSignature
      });
      
      if (expectedSignatureHex !== receivedSignature) {
        console.error('Invalid webhook signature');
        return new Response('Invalid signature', { status: 400, headers: corsHeaders });
      }
    } catch (sigError) {
      console.error('Signature verification error:', sigError);
      return new Response('Signature verification failed', { status: 400, headers: corsHeaders });
    }

    // Parse the event
    const event = JSON.parse(body);
    console.log(`Processing event: ${event.type} (${event.id})`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Supabase environment variables not configured');
      return new Response('Supabase not configured', { status: 500, headers: corsHeaders });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check for idempotency
    const { data: existingEvent } = await supabase
      .from('stripe_event_log')
      .select('id')
      .eq('id', event.id)
      .single();

    if (existingEvent) {
      console.log(`Event ${event.id} already processed, returning 200`);
      return new Response('OK', { status: 200, headers: corsHeaders });
    }

    // Process the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const customerId = session.customer;
        const subscriptionId = session.subscription;
        const email = session.customer_details?.email || session.customer_email;
        const userId = session.metadata?.supabase_user_id;
        const inferredPlan = session.metadata?.plan || inferPlanFromPaymentLinkUrl(session);
        
        console.log('Processing checkout.session.completed:', {
          email,
          customerId,
          subscriptionId,
          inferredPlan,
          metadata: session.metadata,
          customer_details: session.customer_details
        });
        
        const payload = {
          stripe_customer_id: customerId,
          subscription_id: subscriptionId,
          plan: inferredPlan, // FIXED: Set the plan field
          subscription_status: 'active',
          plan_joined_at: new Date().toISOString() // FIXED: Set plan_joined_at
        };

        if (email) {
          console.log(`About to update user ${email} with payload:`, payload);
          await upsertUser(supabase, email, payload);
          console.log(`Successfully updated user ${email} with plan ${inferredPlan} and plan_joined_at`);
        } else {
          console.error('No email found in checkout session');
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const customerId = sub.customer;
        const price = sub.items.data[0].price;
        const plan = choosePlan(price.id, price.nickname);
        
        const payload = {
          stripe_customer_id: customerId,
          subscription_id: sub.id,
          plan: plan, // FIXED: Set the plan field
          subscription_status: sub.status,
          current_period_start: toTimestamp(sub.current_period_start),
          current_period_end: toTimestamp(sub.current_period_end),
          plan_joined_at: sub.status === 'active' ? new Date().toISOString() : null // FIXED: Set plan_joined_at for active subscriptions
        };

        const userId = sub.metadata?.supabase_user_id || await findByCustomer(supabase, customerId);
        if (userId) {
          await upsertUser(supabase, userId, payload);
        }
        break;
      }

      case 'invoice.paid': {
        const inv = event.data.object;
        const price = inv.lines.data[0].price;
        const plan = choosePlan(price.id, price.nickname);
        
        const payload = {
          stripe_customer_id: inv.customer,
          subscription_id: inv.subscription,
          plan: plan, // FIXED: Set the plan field
          subscription_status: 'active',
          current_period_start: toTimestamp(inv.lines.data[0].period.start),
          current_period_end: toTimestamp(inv.lines.data[0].period.end),
          plan_joined_at: new Date().toISOString() // FIXED: Set plan_joined_at
        };

        const userId = inv.metadata?.supabase_user_id || inv.customer_email;
        if (userId) {
          await upsertUser(supabase, userId, payload);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const inv = event.data.object;
        
        const payload = {
          stripe_customer_id: inv.customer,
          subscription_id: inv.subscription,
          subscription_status: 'past_due'
        };

        const userId = inv.metadata?.supabase_user_id || inv.customer_email;
        if (userId) {
          await upsertUser(supabase, userId, payload);
        }
        break;
      }

      default:
        console.log(`Ignoring event type: ${event.type}`);
    }

    // Log the event for idempotency
    const { error: logError } = await supabase
      .from('stripe_event_log')
      .insert({
        id: event.id,
        type: event.type
      });

    if (logError) {
      console.error('Error logging event:', logError);
    }

    console.log('Webhook processed successfully');
    return new Response('OK', { status: 200, headers: corsHeaders });

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(`Webhook error: ${error.message}`, { status: 400, headers: corsHeaders });
  }
});
