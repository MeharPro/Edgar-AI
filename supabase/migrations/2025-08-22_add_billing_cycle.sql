-- Add billing cycle tracking to users table (only if columns don't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'billing_cycle_start') THEN
        ALTER TABLE public.users ADD COLUMN billing_cycle_start timestamptz NOT NULL DEFAULT now();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'plan_joined_at') THEN
        ALTER TABLE public.users ADD COLUMN plan_joined_at timestamptz;
    END IF;
END $$;

-- Update existing users to have billing cycle start from their created_at date
UPDATE public.users 
SET billing_cycle_start = created_at
WHERE billing_cycle_start = '2025-08-22 04:53:29.827863+00';

-- Function to get current billing cycle start date
CREATE OR REPLACE FUNCTION public.get_current_billing_cycle_start(p_user_id uuid)
RETURNS timestamptz
LANGUAGE plpgsql
AS $$
DECLARE
  user_billing_start timestamptz;
  current_cycle_start timestamptz;
BEGIN
  -- Get user's billing cycle start date
  SELECT billing_cycle_start INTO user_billing_start
  FROM public.users 
  WHERE id = p_user_id;
  
  -- Calculate current billing cycle start (same day of month, current month)
  current_cycle_start := date_trunc('month', now()) + 
    (EXTRACT(day FROM user_billing_start) - 1) * interval '1 day';
  
  -- If the calculated date is in the future, go back one month
  IF current_cycle_start > now() THEN
    current_cycle_start := current_cycle_start - interval '1 month';
  END IF;
  
  RETURN current_cycle_start;
END;
$$;

-- Function to update monthly usage and check limits with proper billing cycles
CREATE OR REPLACE FUNCTION public.update_monthly_usage_and_check_limit(
  p_user_id uuid,
  p_tokens_to_add bigint
) RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  user_plan text;
  current_cycle_start timestamptz;
  current_cycle_end timestamptz;
  current_monthly_total bigint;
  plan_limit bigint;
BEGIN
  -- Get user's plan
  SELECT plan INTO user_plan
  FROM public.users 
  WHERE id = p_user_id;
  
  -- Get current billing cycle dates
  current_cycle_start := public.get_current_billing_cycle_start(p_user_id);
  current_cycle_end := current_cycle_start + interval '1 month';
  
  -- Get current billing cycle usage
  SELECT COALESCE(SUM(charged_tokens), 0) INTO current_monthly_total
  FROM public.usage_details
  WHERE user_id = p_user_id 
    AND timestamp >= current_cycle_start 
    AND timestamp < current_cycle_end;
  
  -- Set plan limits (MONTHLY)
  CASE user_plan
    WHEN 'starter' THEN plan_limit := 5000;
            WHEN 'pro' THEN plan_limit := 2000000;
        WHEN 'max' THEN plan_limit := 10000000;
    ELSE plan_limit := 5000; -- default to starter
  END CASE;
  
  -- Check if adding tokens would exceed monthly limit
  IF current_monthly_total + p_tokens_to_add > plan_limit THEN
    RETURN false; -- Would exceed monthly limit
  END IF;
  
  -- No need to update a separate table, just return success
  -- The usage_details table already has the data we need
  RETURN true; -- Success
END;
$$;

-- Function to update plan and reset billing cycle when user changes plans
CREATE OR REPLACE FUNCTION public.update_user_plan(
  p_user_id uuid,
  p_new_plan text
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  current_plan text;
BEGIN
  -- Get current plan
  SELECT plan INTO current_plan
  FROM public.users 
  WHERE id = p_user_id;
  
  -- Only update if plan is actually changing
  IF current_plan != p_new_plan THEN
    -- Update user's plan and set new billing cycle start
    UPDATE public.users 
    SET plan = p_new_plan,
        plan_joined_at = now(),
        billing_cycle_start = now()
    WHERE id = p_user_id;
  END IF;
END;
$$;
