-- Add leaderboard opt-in to existing users table
alter table public.users
  add column if not exists leaderboard_opt_in boolean not null default false;


