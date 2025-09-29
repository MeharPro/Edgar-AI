-- Canonical billing cycle window helper that prefers Stripe periods
-- Returns the active cycle start/end for a given user.
-- If Stripe period fields are present, uses them (and rolls forward as needed).
-- Otherwise, falls back to the user's billing_cycle_start day-of-month anchor.

CREATE OR REPLACE FUNCTION public.get_billing_cycle_window(
  p_user_id uuid
) RETURNS TABLE (
  cycle_start timestamptz,
  cycle_end timestamptz
)
LANGUAGE plpgsql
AS $$
DECLARE
  u_current_period_start timestamptz;
  u_current_period_end timestamptz;
  u_billing_cycle_start timestamptz;
BEGIN
  -- Load period fields and fallback anchor
  SELECT current_period_start, current_period_end, billing_cycle_start
    INTO u_current_period_start, u_current_period_end, u_billing_cycle_start
  FROM public.users
  WHERE id = p_user_id;

  -- 1) Stripe-managed subscription window (authoritative when present)
  IF u_current_period_start IS NOT NULL AND u_current_period_end IS NOT NULL THEN
    cycle_start := u_current_period_start;
    cycle_end := u_current_period_end;

    -- In case webhook lagged and we're past recorded end, roll forward by whole months
    WHILE now() >= cycle_end LOOP
      cycle_start := cycle_end;
      cycle_end := cycle_start + interval '1 month';
    END LOOP;

    RETURN NEXT;
    RETURN;
  END IF;

  -- 2) Fallback: compute by day-of-month anchor (free plan or no Stripe data)
  IF u_billing_cycle_start IS NULL THEN
    -- Sensible default: start of current month
    u_billing_cycle_start := now();
  END IF;

  cycle_start := date_trunc('month', now())
                 + (EXTRACT(day FROM u_billing_cycle_start)::int - 1) * interval '1 day';

  -- If this month's anchor is in the future (e.g., 31st in a 30‑day month -> rolled to next month),
  -- then use previous month.
  IF cycle_start > now() THEN
    cycle_start := (cycle_start - interval '1 month');
  END IF;

  cycle_end := cycle_start + interval '1 month';

  RETURN NEXT;
  RETURN;
END;
$$;

-- Backward‑compat: expose start-only function via new window helper
CREATE OR REPLACE FUNCTION public.get_current_billing_cycle_start(
  p_user_id uuid
) RETURNS timestamptz
LANGUAGE plpgsql
AS $$
DECLARE
  s timestamptz;
  e timestamptz;
BEGIN
  SELECT cycle_start, cycle_end INTO s, e
  FROM public.get_billing_cycle_window(p_user_id);
  RETURN s;
END;
$$;

