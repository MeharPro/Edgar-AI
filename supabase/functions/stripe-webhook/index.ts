import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

// Plan resolution mappings - ACTUAL STRIPE PRICE IDs
const PLAN_BY_PRICE_ID = {
  "price_1RyzmuKoK7HcifPAXCmjV4IU": "pro",  // Pro product
  "price_1Rz0BDKoK7HcifPATcdcwafA": "max"   // Max product
};

const PLAN_BY_LOOKUP_KEY = {
  // Add your Stripe lookup keys here if you set them
  // Example: "plan_pro": "pro",
  // Example: "plan_max": "max"
};

// Utility functions
function toTimestamp(unix) {
  return new Date(unix * 1000).toISOString();
}

// Bulletproof plan resolution from subscription data
function resolvePlanFromSubscription(sub) {
  console.log('Resolving plan from subscription:', {
    subscription_id: sub.id,
    items_count: sub.items?.data?.length,
    first_item: sub.items?.data?.[0]
  });

  if (!sub.items?.data?.[0]) {
    console.log('No subscription items found');
    return null;
  }

  const item = sub.items.data[0];
  const price = item.price;

  console.log('Price details:', {
    price_id: price.id,
    lookup_key: price.lookup_key,
    nickname: price.nickname,
    metadata: price.metadata
  });

  // 1. Check lookup key first (most reliable)
  if (price.lookup_key && PLAN_BY_LOOKUP_KEY[price.lookup_key]) {
    const plan = PLAN_BY_LOOKUP_KEY[price.lookup_key];
    console.log(`Plan resolved from lookup_key (${price.lookup_key}): ${plan}`);
    return plan;
  }

  // 2. Check price metadata tier
  if (price.metadata?.tier && ['pro', 'max'].includes(price.metadata.tier)) {
    const plan = price.metadata.tier;
    console.log(`Plan resolved from price metadata tier: ${plan}`);
    return plan;
  }

  // 3. Check price ID mapping
  if (PLAN_BY_PRICE_ID[price.id]) {
    const plan = PLAN_BY_PRICE_ID[price.id];
    console.log(`Plan resolved from price ID mapping: ${plan}`);
    return plan;
  }

  // 4. Check nickname as fallback
  if (price.nickname) {
    const nickname = price.nickname.toLowerCase();
    if (nickname.includes('pro')) {
      console.log('Plan resolved from nickname (pro): pro');
      return 'pro';
    }
    if (nickname.includes('max')) {
      console.log('Plan resolved from nickname (max): max');
      return 'max';
    }
  }

  // 5. Check subscription metadata
  if (sub.metadata?.plan && ['pro', 'max'].includes(sub.metadata.plan)) {
    const plan = sub.metadata.plan;
    console.log(`Plan resolved from subscription metadata: ${plan}`);
    return plan;
  }

  console.log('Could not resolve plan from subscription data');
  return null;
}

// User key resolution helper
function userKeyFrom(obj) {
  // Priority: explicit metadata → email → customer lookup fallback
  if (obj.metadata?.supabase_user_id) {
    return { by: "id", val: obj.metadata.supabase_user_id };
  }
  if (obj.customer_email) {
    return { by: "email", val: obj.customer_email };
  }
  if (obj.customer_details?.email) {
    return { by: "email", val: obj.customer_details.email };
  }
  return null;
}

async function upsertUser(supabase, key, payload) {
  console.log(`Attempting to upsert user with key:`, key, 'payload:', payload);
  
  if (!key) {
    console.error('No user key provided');
    return;
  }

  // IMPORTANT: never overwrite plan with null or a guess
  if (payload.plan === null || payload.plan === undefined) {
    delete payload.plan;
    console.log('Removed null/undefined plan from payload');
  }

  let existingUser;
  let selectError;

  // Check if key is an email or UUID
  if (key.val.includes('@')) {
    // Key is an email, search by email
    const { data, error } = await supabase.from('users').select('id, plan').eq('email', key.val).single();
    existingUser = data;
    selectError = error;
  } else {
    // Key is a UUID, search by ID
    const { data, error } = await supabase.from('users').select('id, plan').eq('id', key.val).single();
    existingUser = data;
    selectError = error;
  }

  if (selectError) {
    console.error('Error finding user:', selectError);
    throw selectError;
  }

  console.log('Found existing user:', existingUser);

  if (existingUser) {
    // Update by user ID
    const oldPlan = existingUser.plan;
    const newPlan = payload.plan;
    
    if (oldPlan !== newPlan) {
      console.log(`Updating user ${existingUser.id} from plan ${oldPlan} to ${newPlan}`);
    } else {
      console.log(`Updating user ${existingUser.id} (plan unchanged: ${oldPlan})`);
    }

    const { error } = await supabase.from('users').update(payload).eq('id', existingUser.id);
    if (error) {
      console.error('Error updating user:', error);
      throw error;
    }
    console.log(`Successfully updated user ${existingUser.id}`);
  } else {
    console.error('User not found for key:', key);
  }
}

async function findByCustomer(supabase, customerId) {
  const { data: user } = await supabase.from('users').select('id').eq('stripe_customer_id', customerId).single();
  return user ? { by: "id", val: user.id } : null;
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
      return new Response('Missing stripe-signature header', {
        status: 400,
        headers: corsHeaders
      });
    }

    const body = await req.text();
    console.log('Request body length:', body.length);
    
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET_SNAPSHOT');
    console.log('Webhook secret configured:', !!webhookSecret);
    
    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET_SNAPSHOT not configured');
      return new Response('Webhook secret not configured', {
        status: 500,
        headers: corsHeaders
      });
    }

    // Verify webhook signature using crypto
    try {
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey('raw', encoder.encode(webhookSecret), {
        name: 'HMAC',
        hash: 'SHA-256'
      }, false, ['sign', 'verify']);
      
      const timestamp = signature.split(',')[0].split('=')[1];
      const signedPayload = `${timestamp}.${body}`;
      const expectedSignature = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload));
      const expectedSignatureHex = Array.from(new Uint8Array(expectedSignature)).map((b) => b.toString(16).padStart(2, '0')).join('');
      const receivedSignature = signature.split(',')[1].split('=')[1];
      
      console.log('Signature verification:', {
        timestamp,
        expectedSignatureHex: expectedSignatureHex.substring(0, 20) + '...',
        receivedSignature: receivedSignature.substring(0, 20) + '...',
        match: expectedSignatureHex === receivedSignature
      });
      
      if (expectedSignatureHex !== receivedSignature) {
        console.error('Invalid webhook signature');
        return new Response('Invalid signature', {
          status: 400,
          headers: corsHeaders
        });
      }
    } catch (sigError) {
      console.error('Signature verification error:', sigError);
      return new Response('Signature verification failed', {
        status: 400,
        headers: corsHeaders
      });
    }

    // Parse the event
    const event = JSON.parse(body);
    console.log(`Processing event: ${event.type} (${event.id})`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Supabase environment variables not configured');
      return new Response('Supabase not configured', {
        status: 500,
        headers: corsHeaders
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check for idempotency
    const { data: existingEvent } = await supabase.from('stripe_event_log').select('id').eq('id', event.id).single();
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
        
        console.log('Processing checkout.session.completed:', {
          session_id: session.id,
          customer_id: customerId,
          subscription_id: subscriptionId,
          metadata: session.metadata,
          customer_details: session.customer_details
        });

        // Always store IDs quickly (email → user)
        const userKey = userKeyFrom(session);
        if (userKey) {
          const basicPayload = {
            stripe_customer_id: customerId,
            subscription_id: subscriptionId,
            subscription_status: 'active'
          };
          
          await upsertUser(supabase, userKey, basicPayload);
          console.log(`Stored basic subscription info for user`);
        }

        // If you want the plan NOW (optional):
        if (subscriptionId) {
          console.log(`Subscription ID found: ${subscriptionId}, will be handled by subscription.* events`);
          // The subscription events will handle the plan resolution
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const customerId = sub.customer;
        
        console.log('Processing subscription event:', {
          subscription_id: sub.id,
          customer_id: customerId,
          status: sub.status,
          metadata: sub.metadata
        });

        // Resolve plan from subscription data (canonical source)
        const plan = resolvePlanFromSubscription(sub);
        
        const payload = {
          stripe_customer_id: customerId,
          subscription_id: sub.id,
          subscription_status: sub.status,
          current_period_start: toTimestamp(sub.current_period_start),
          current_period_end: toTimestamp(sub.current_period_end)
        };

        // Only set plan if we can prove it
        if (plan) {
          payload.plan = plan;
          payload.plan_joined_at = sub.status === 'active' ? new Date().toISOString() : null;
        }

        // Find user by subscription metadata or customer lookup
        let userKey = userKeyFrom(sub);
        if (!userKey && customerId) {
          userKey = await findByCustomer(supabase, customerId);
        }

        if (userKey) {
          await upsertUser(supabase, userKey, payload);
        } else {
          console.error('Could not find user for subscription:', sub.id);
        }
        break;
      }

      case 'invoice.paid': {
        const inv = event.data.object;
        const customerId = inv.customer;
        const subscriptionId = inv.subscription;
        
        console.log('Processing invoice.paid:', {
          invoice_id: inv.id,
          customer_id: customerId,
          subscription_id: subscriptionId
        });

        // For invoices, we can also resolve plan from line items
        let plan = null;
        if (inv.lines?.data?.[0]?.price) {
          const price = inv.lines.data[0].price;
          
          // Use the same resolution logic as subscriptions
          if (price.lookup_key && PLAN_BY_LOOKUP_KEY[price.lookup_key]) {
            plan = PLAN_BY_LOOKUP_KEY[price.lookup_key];
          } else if (price.metadata?.tier && ['pro', 'max'].includes(price.metadata.tier)) {
            plan = price.metadata.tier;
          } else if (PLAN_BY_PRICE_ID[price.id]) {
            plan = PLAN_BY_PRICE_ID[price.id];
          } else if (price.nickname) {
            const nickname = price.nickname.toLowerCase();
            if (nickname.includes('pro')) plan = 'pro';
            if (nickname.includes('max')) plan = 'max';
          }
        }

        const payload = {
          stripe_customer_id: customerId,
          subscription_id: subscriptionId,
          subscription_status: 'active',
          current_period_start: toTimestamp(inv.lines.data[0].period.start),
          current_period_end: toTimestamp(inv.lines.data[0].period.end)
        };

        if (plan) {
          payload.plan = plan;
          payload.plan_joined_at = new Date().toISOString();
        }

        const userKey = userKeyFrom(inv);
        if (userKey) {
          await upsertUser(supabase, userKey, payload);
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

        const userKey = userKeyFrom(inv);
        if (userKey) {
          await upsertUser(supabase, userKey, payload);
        }
        break;
      }

      default:
        console.log(`Ignoring event type: ${event.type}`);
    }

    // Log the event for idempotency
    const { error: logError } = await supabase.from('stripe_event_log').insert({
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
    return new Response(`Webhook error: ${error.message}`, {
      status: 400,
      headers: corsHeaders
    });
  }
});
