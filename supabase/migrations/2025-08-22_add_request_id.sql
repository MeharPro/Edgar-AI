-- Add request_id column to usage_details table for deduplication
ALTER TABLE public.usage_details 
ADD COLUMN request_id text;

-- Create unique index on request_id to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS usage_details_request_id_unique 
ON public.usage_details (request_id);

-- Update increment_usage function to accept request_id parameter
CREATE OR REPLACE FUNCTION public.increment_usage(
  p_user_id uuid,
  p_tokens bigint,
  p_provider text,
  p_model text,
  p_request_id text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  m text := to_char(now(), 'YYYY-MM');
BEGIN
  -- Only increment if this request_id hasn't been processed before
  IF p_request_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.usage_details 
    WHERE request_id = p_request_id
  ) THEN
    INSERT INTO public.usage (user_id, month, tokens)
    VALUES (p_user_id, m, p_tokens)
    ON CONFLICT (user_id, month) DO UPDATE
      SET tokens = public.usage.tokens + excluded.tokens;

    INSERT INTO public.usage_breakdown (user_id, month, provider, model, tokens)
    VALUES (p_user_id, m, p_provider, p_model, p_tokens)
    ON CONFLICT (user_id, month, provider, model) DO UPDATE
      SET tokens = public.usage_breakdown.tokens + excluded.tokens;
  END IF;
END;
$$;
