-- Remove last4 column from api_keys (no longer stored)
alter table public.api_keys drop column if exists last4;


