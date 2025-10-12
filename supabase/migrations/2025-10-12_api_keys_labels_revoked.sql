-- Add label and revoked_at to api_keys for multi-key + rotation support
alter table public.api_keys add column if not exists label text;
alter table public.api_keys add column if not exists revoked_at timestamptz;

