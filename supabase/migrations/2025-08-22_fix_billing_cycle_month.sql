-- Fix billing cycle to use proper month increments instead of 30.5 days
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
