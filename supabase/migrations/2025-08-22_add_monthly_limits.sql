-- Add monthly usage tracking table
CREATE TABLE IF NOT EXISTS public.monthly_usage (
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  month text NOT NULL, -- format YYYY-MM
  tokens bigint NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, month)
);

-- Enable RLS
ALTER TABLE public.monthly_usage ENABLE ROW LEVEL SECURITY;

-- Function to update monthly usage and check limits
CREATE OR REPLACE FUNCTION public.update_monthly_usage_and_check_limit(
  p_user_id uuid,
  p_tokens_to_add bigint
) RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  user_plan text;
  current_month text;
  current_monthly_total bigint;
  plan_limit bigint;
BEGIN
  -- Get user's plan
  SELECT plan INTO user_plan
  FROM public.users 
  WHERE id = p_user_id;
  
  -- Get current month
  current_month := to_char(now(), 'YYYY-MM');
  
  -- Get current monthly usage
  SELECT COALESCE(tokens, 0) INTO current_monthly_total
  FROM public.monthly_usage
  WHERE user_id = p_user_id AND month = current_month;
  
  -- Set plan limits (MONTHLY)
  CASE user_plan
    WHEN 'starter' THEN plan_limit := 5000;
    WHEN 'pro' THEN plan_limit := 10000000;
    WHEN 'max' THEN plan_limit := 2147483647; -- Max bigint value (effectively infinite)
    ELSE plan_limit := 5000; -- default to starter
  END CASE;
  
  -- Check if adding tokens would exceed monthly limit
  IF current_monthly_total + p_tokens_to_add > plan_limit THEN
    RETURN false; -- Would exceed monthly limit
  END IF;
  
  -- Update monthly usage
  INSERT INTO public.monthly_usage (user_id, month, tokens)
  VALUES (p_user_id, current_month, p_tokens_to_add)
  ON CONFLICT (user_id, month) DO UPDATE
    SET tokens = public.monthly_usage.tokens + excluded.tokens;
  
  RETURN true; -- Success
END;
$$;
