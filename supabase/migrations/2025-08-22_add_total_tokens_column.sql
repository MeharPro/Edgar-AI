-- Add total_tokens column to track cumulative usage for plan limits
ALTER TABLE public.users 
ADD COLUMN total_tokens bigint NOT NULL DEFAULT 0;

-- Update existing users with their current total usage
UPDATE public.users 
SET total_tokens = (
  SELECT COALESCE(SUM(charged_tokens), 0)
  FROM public.usage_details 
  WHERE user_id = users.id
);

-- Create function to update total tokens and check plan limits
CREATE OR REPLACE FUNCTION public.update_total_tokens_and_check_limit(
  p_user_id uuid,
  p_tokens_to_add bigint
) RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  user_plan text;
  current_total bigint;
  plan_limit bigint;
BEGIN
  -- Get user's plan and current total
  SELECT plan, total_tokens INTO user_plan, current_total
  FROM public.users 
  WHERE id = p_user_id;
  
  -- Set plan limits
  CASE user_plan
    WHEN 'starter' THEN plan_limit := 5000;
            WHEN 'pro' THEN plan_limit := 2000000;
        WHEN 'max' THEN plan_limit := 10000000;
    ELSE plan_limit := 5000; -- default to starter
  END CASE;
  
  -- Check if adding tokens would exceed limit
  IF current_total + p_tokens_to_add > plan_limit THEN
    RETURN false; -- Would exceed limit
  END IF;
  
  -- Update total tokens
  UPDATE public.users 
  SET total_tokens = total_tokens + p_tokens_to_add
  WHERE id = p_user_id;
  
  RETURN true; -- Success
END;
$$;
