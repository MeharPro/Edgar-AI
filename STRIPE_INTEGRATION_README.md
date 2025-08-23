# Stripe Payment Links + Supabase Integration

This document outlines the complete setup for integrating Stripe Payment Links with Supabase for subscription management in the Edgar API platform.

## Overview

The integration provides:
- **Payment Links**: Direct checkout links for Pro ($20) and Max ($100) plans
- **Webhook Processing**: Real-time subscription status updates via Supabase Edge Functions
- **Database Mirroring**: Stripe subscription data mirrored in Supabase for fast reads
- **Idempotency**: Prevents duplicate processing of webhook events
- **Admin Tools**: Manual resync capabilities for troubleshooting

## Environment Variables

Set these environment variables in your Supabase project:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_... # Your Stripe secret key (get from Stripe Dashboard)
STRIPE_WEBHOOK_SECRET_SNAPSHOT=whsec_... # From Stripe webhook endpoint settings
STRIPE_WEBHOOK_SECRET_THIN=whsec_... # From Stripe webhook endpoint settings

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

## Database Schema

### Users Table Updates

The following columns are added to the `users` table:

```sql
-- Stripe integration fields
stripe_customer_id text
subscription_id text
subscription_status text DEFAULT 'inactive'
current_period_start timestamptz
current_period_end timestamptz
```

### Stripe Event Log Table

```sql
CREATE TABLE public.stripe_event_log (
  id text PRIMARY KEY,
  type text NOT NULL,
  inserted_at timestamptz DEFAULT now()
);
```

## Payment Links

### Pro Plan ($20/month)
- **URL**: https://buy.stripe.com/8x28wQ7Qwa6zgps1KJ4Vy01
- **Plan Mapping**: `...Vy01` → `plan = "pro"`
- **Token Limit**: 10M tokens/month

### Max Plan ($100/month)
- **URL**: https://buy.stripe.com/7sYcN63AgceHb588974Vy02
- **Plan Mapping**: `...Vy02` → `plan = "max"`
- **Token Limit**: Unlimited tokens

## Webhook Configuration

### Snapshot Destination (Primary)
- **URL**: `https://bycnvwanjzgkctqqklos.supabase.co/functions/v1/stripe-webhook`
- **Payload Style**: Snapshot
- **Events**: 175 events (including all required events)
- **Secret**: `whsec_SlXqbfV1mh3N5MTNqbeEELEunze1Y0t8`

#### Required Events
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

#### Optional Events
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- `customer.subscription.trial_will_end`

### Thin Destination (No-op)
- **URL**: `https://bycnvwanjzgkctqqklos.supabase.co/functions/v1/stripe-webhook-thin`
- **Payload Style**: Thin
- **Events**: 6 events (minimal set)
- **Secret**: `whsec_trlg5esAo0eXRqMLNQ07vS4qAR9NwdgM`
- **Purpose**: Signature verification only, no side effects

## Edge Functions

### stripe-webhook (Primary Handler)

**Location**: `supabase/functions/stripe-webhook/index.ts`

**Features**:
- Verifies Stripe webhook signatures
- Processes Snapshot payloads
- Updates user subscription data
- Implements idempotency via `stripe_event_log`
- Handles all subscription lifecycle events

**Event Processing**:

1. **checkout.session.completed**
   - Creates/updates user with Stripe customer ID
   - Sets subscription status to "active"
   - Infers plan from payment link URL or metadata

2. **customer.subscription.created/updated/deleted**
   - Updates subscription status and billing periods
   - Maps price IDs to internal plan names
   - Sets current_period_start and current_period_end

3. **invoice.paid**
   - Confirms active subscription
   - Updates billing period information
   - Handles successful payments

4. **invoice.payment_failed**
   - Sets subscription status to "past_due"
   - Maintains existing billing data

### stripe-webhook-thin (No-op Handler)

**Location**: `supabase/functions/stripe-webhook-thin/index.ts`

**Features**:
- Verifies Stripe webhook signatures
- Returns 200 immediately
- No database operations
- Logs events for monitoring

## Payment Link Requirements

### Metadata Configuration

Set metadata on Payment Links or Prices:

```json
{
  "supabase_user_id": "user_uuid_here",
  "plan": "pro" // or "max"
}
```

### Email Collection

Ensure Payment Links are configured to collect customer email addresses for fallback user matching.

## Client Application Integration

### Dashboard Updates

The dashboard now displays:
- **Subscription Status**: Active/Inactive with visual indicators
- **Plan Information**: Current plan with pricing
- **Billing Period**: Renewal dates and cycle information
- **Upgrade Buttons**: Direct links to payment pages
- **Usage Limits**: Plan-specific token limits

### Subscription Status Logic

```typescript
const isSubscriptionActive = () => {
  const activeStatuses = ["active", "trialing"];
  const isActive = activeStatuses.includes(subscription_status);
  const isNotExpired = new Date(current_period_end) > new Date();
  return isActive && isNotExpired;
};
```

### Feature Gating

Gate Pro and Max features based on subscription status:

```typescript
const canAccessProFeatures = () => {
  return isSubscriptionActive() && ["pro", "max"].includes(user.plan);
};
```

## Admin Tools

### Manual Resync Endpoint

**Endpoint**: `POST /api/admin/resync-stripe`

**Purpose**: Manually resync subscription data from Stripe

**Usage**:
```bash
curl -X POST /api/admin/resync-stripe \
  -H "Content-Type: application/json" \
  -d '{"userId": "user_uuid_here"}'
```

**Access Control**: Only accessible by admin users (currently hardcoded to `meharkhanna@gmail.com`)

## Testing

### Stripe CLI Testing

Use Stripe CLI to test webhook events:

```bash
# Test checkout completion
stripe trigger checkout.session.completed

# Test subscription creation
stripe trigger customer.subscription.created

# Test invoice payment
stripe trigger invoice.paid

# Test payment failure
stripe trigger invoice.payment_failed
```

### Verification Checklist

- [ ] Webhook signatures are verified
- [ ] Idempotency prevents duplicate processing
- [ ] User records are updated correctly
- [ ] Plan mapping works for both payment links
- [ ] Billing periods are set correctly
- [ ] Subscription status reflects Stripe state
- [ ] Thin webhook returns 200 without side effects

## Troubleshooting

### Common Issues

1. **Webhook Signature Verification Fails**
   - Verify webhook secrets are correct
   - Check that secrets match Stripe dashboard
   - Ensure no trailing whitespace in environment variables

2. **User Not Found**
   - Check that `supabase_user_id` metadata is set on Payment Links
   - Verify email matching fallback works
   - Ensure user exists in Supabase before payment

3. **Plan Mapping Issues**
   - Verify Payment Link URLs contain correct identifiers (`Vy01`, `Vy02`)
   - Check price nicknames in Stripe dashboard
   - Review plan mapping logic in webhook handler

4. **Duplicate Processing**
   - Check `stripe_event_log` table for existing events
   - Verify idempotency logic is working
   - Review webhook retry behavior

### Monitoring

Monitor webhook processing via:
- Supabase Edge Function logs
- `stripe_event_log` table
- User subscription status changes
- Stripe webhook delivery status

## Security Considerations

- **Never expose service role keys** to client applications
- **Always verify webhook signatures** before processing
- **Use idempotency** to prevent duplicate processing
- **Log all events** for audit trails
- **Implement proper access controls** for admin endpoints

## Deployment

1. **Run Database Migration**:
   ```bash
   # Apply the Stripe integration migration
   # This adds the required columns and tables
   ```

2. **Deploy Edge Functions**:
   ```bash
   supabase functions deploy stripe-webhook
   supabase functions deploy stripe-webhook-thin
   ```

3. **Set Environment Variables** in Supabase dashboard

4. **Configure Stripe Webhooks** in Stripe dashboard

5. **Test with Stripe CLI** before going live

## Support

For issues with this integration:
1. Check Supabase Edge Function logs
2. Verify Stripe webhook delivery status
3. Review `stripe_event_log` for processing history
4. Use admin resync endpoint for manual fixes
5. Contact support with specific error details
