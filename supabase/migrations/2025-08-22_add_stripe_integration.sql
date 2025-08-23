-- Add Stripe integration fields to users table
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'stripe_customer_id') THEN
    ALTER TABLE public.users ADD COLUMN stripe_customer_id text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'subscription_id') THEN
    ALTER TABLE public.users ADD COLUMN subscription_id text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'subscription_status') THEN
    ALTER TABLE public.users ADD COLUMN subscription_status text DEFAULT 'inactive';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'current_period_start') THEN
    ALTER TABLE public.users ADD COLUMN current_period_start timestamptz;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'current_period_end') THEN
    ALTER TABLE public.users ADD COLUMN current_period_end timestamptz;
  END IF;
END $$;

-- Create stripe_event_log table for idempotency
CREATE TABLE IF NOT EXISTS public.stripe_event_log (
  id text PRIMARY KEY,
  type text NOT NULL,
  inserted_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON public.users(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_users_subscription_id ON public.users(subscription_id);
CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON public.users(subscription_status);
CREATE INDEX IF NOT EXISTS idx_stripe_event_log_inserted_at ON public.stripe_event_log(inserted_at);

-- Enable RLS on stripe_event_log
ALTER TABLE public.stripe_event_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for stripe_event_log (admin only)
CREATE POLICY "Admin can manage stripe_event_log" ON public.stripe_event_log
  FOR ALL USING (auth.role() = 'service_role');
