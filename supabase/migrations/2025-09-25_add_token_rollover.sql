-- Token rollover support
-- Adds per-user rollover tracking and an idempotent function to apply rollover

-- Add rollover columns to users table if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'rollover_tokens'
  ) THEN
    ALTER TABLE public.users ADD COLUMN rollover_tokens bigint NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'last_rollover_applied'
  ) THEN
    ALTER TABLE public.users ADD COLUMN last_rollover_applied timestamptz;
  END IF;
END $$;

-- Apply token rollover from the previous billing cycle.
-- Policy: carry over only the unused tokens from the immediately previous cycle,
-- capped at the plan's monthly limit. No multi-month accumulation.
CREATE OR REPLACE FUNCTION public.apply_token_rollover(
  p_user_id uuid
) RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  user_plan text;
  plan_limit bigint;
  current_cycle_start timestamptz;
  previous_cycle_start timestamptz;
  previous_cycle_end timestamptz;
  prev_usage bigint;
  new_rollover bigint;
  u_created_at timestamptz;
  u_plan_joined_at timestamptz;
  u_last_rollover timestamptz;
BEGIN
  -- Fetch user info
  SELECT plan, created_at, plan_joined_at, last_rollover_applied
    INTO user_plan, u_created_at, u_plan_joined_at, u_last_rollover
  FROM public.users 
  WHERE id = p_user_id;

  -- Determine current cycle window
  current_cycle_start := public.get_current_billing_cycle_start(p_user_id);
  previous_cycle_start := current_cycle_start - interval '1 month';
  previous_cycle_end := current_cycle_start;

  -- No-op if rollover already applied for this cycle
  IF u_last_rollover IS NOT NULL AND u_last_rollover >= current_cycle_start THEN
    RETURN;
  END IF;

  -- Resolve plan limit
  CASE user_plan
    WHEN 'starter' THEN plan_limit := 5000;
    WHEN 'pro' THEN plan_limit := 2000000;
    WHEN 'max' THEN plan_limit := 10000000;
    ELSE plan_limit := 5000;
  END CASE;

  -- If the account (or plan) did not exist during the previous cycle, no rollover
  IF (u_created_at IS NOT NULL AND u_created_at > previous_cycle_start)
     OR (u_plan_joined_at IS NOT NULL AND u_plan_joined_at > previous_cycle_start) THEN
    new_rollover := 0;
  ELSE
    -- Sum usage in the previous cycle
    SELECT COALESCE(SUM(charged_tokens), 0) INTO prev_usage
    FROM public.usage_details
    WHERE user_id = p_user_id
      AND timestamp >= previous_cycle_start
      AND timestamp < previous_cycle_end;

    -- Carry over unused tokens from the previous cycle, capped at one plan limit
    new_rollover := GREATEST(plan_limit - prev_usage, 0);
  END IF;

  -- Persist rollover for the new cycle and mark as applied
  UPDATE public.users
  SET rollover_tokens = new_rollover,
      last_rollover_applied = current_cycle_start
  WHERE id = p_user_id;
END;
$$;

