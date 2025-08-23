-- Fix charged_tokens to be total_tokens instead of completion_tokens
UPDATE public.usage_details 
SET charged_tokens = total_tokens 
WHERE charged_tokens != total_tokens;
