-- Add name to users
alter table public.users
  add column if not exists name text;


