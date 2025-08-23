-- Add columns for tracking pending payments and original plans
ALTER TABLE public.users 
ADD COLUMN pending_payment_link text,
ADD COLUMN original_plan text;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_pending_payment_link ON public.users(pending_payment_link);
CREATE INDEX IF NOT EXISTS idx_users_original_plan ON public.users(original_plan);
