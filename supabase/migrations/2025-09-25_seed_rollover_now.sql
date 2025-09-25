-- Seed token rollover for all users as of today
-- This applies rollover for the current cycle based on previous cycle usage.

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.users LOOP
    PERFORM public.apply_token_rollover(r.id);
  END LOOP;
END $$;

--s