-- Ensure rollover is disabled for free (starter) plan and clean up any existing values

-- Update function (defensive in case prior migration didn't apply yet)
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
  SELECT plan, created_at, plan_joined_at, last_rollover_applied
    INTO user_plan, u_created_at, u_plan_joined_at, u_last_rollover
  FROM public.users
  WHERE id = p_user_id;

  current_cycle_start := public.get_current_billing_cycle_start(p_user_id);
  previous_cycle_start := current_cycle_start - interval '1 month';
  previous_cycle_end := current_cycle_start;

  IF u_last_rollover IS NOT NULL AND u_last_rollover >= current_cycle_start THEN
    RETURN;
  END IF;

  -- Free plan: no rollover
  IF user_plan = 'starter' THEN
    UPDATE public.users
    SET rollover_tokens = 0,
        last_rollover_applied = current_cycle_start
    WHERE id = p_user_id;
    RETURN;
  END IF;

  CASE user_plan
    WHEN 'starter' THEN plan_limit := 5000;
    WHEN 'pro' THEN plan_limit := 2000000;
    WHEN 'max' THEN plan_limit := 10000000;
    ELSE plan_limit := 5000;
  END CASE;

  IF (u_created_at IS NOT NULL AND u_created_at > previous_cycle_start)
     OR (u_plan_joined_at IS NOT NULL AND u_plan_joined_at > previous_cycle_start) THEN
    new_rollover := 0;
  ELSE
    SELECT COALESCE(SUM(charged_tokens), 0) INTO prev_usage
    FROM public.usage_details
    WHERE user_id = p_user_id
      AND timestamp >= previous_cycle_start
      AND timestamp < previous_cycle_end;

    new_rollover := GREATEST(plan_limit - prev_usage, 0);
  END IF;

  UPDATE public.users
  SET rollover_tokens = new_rollover,
      last_rollover_applied = current_cycle_start
  WHERE id = p_user_id;
END;
$$;

-- One-time cleanup: zero out any rollover for starter users
UPDATE public.users
SET rollover_tokens = 0
WHERE plan = 'starter' AND rollover_tokens <> 0;

