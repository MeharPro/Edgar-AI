import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify Stripe signature
    const signature = req.headers.get('stripe-signature')
    if (!signature) {
      return new Response('Missing stripe-signature header', { status: 400, headers: corsHeaders })
    }

    const body = await req.text()
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET_THIN')
    
    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET_THIN not configured')
      return new Response('Webhook secret not configured', { status: 500, headers: corsHeaders })
    }

    // Verify webhook signature using crypto
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(webhookSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign', 'verify']
    )

    const timestamp = signature.split(',')[0].split('=')[1]
    const signedPayload = `${timestamp}.${body}`
    const expectedSignature = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload))
    const expectedSignatureHex = Array.from(new Uint8Array(expectedSignature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    const receivedSignature = signature.split(',')[1].split('=')[1]
    
    if (expectedSignatureHex !== receivedSignature) {
      console.error('Invalid webhook signature')
      return new Response('Invalid signature', { status: 400, headers: corsHeaders })
    }

    // Parse the event for logging purposes only
    const event = JSON.parse(body)
    console.log(`Thin webhook received event: ${event.type} (${event.id}) - No-op processing`)

    // Return 200 immediately - no side effects
    return new Response('OK', { status: 200, headers: corsHeaders })

  } catch (error) {
    console.error('Thin webhook error:', error)
    return new Response(`Webhook error: ${error.message}`, { status: 400, headers: corsHeaders })
  }
})
