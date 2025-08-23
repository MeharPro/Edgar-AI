-- Enable required extension for gen_random_uuid
create extension if not exists pgcrypto;

-- Users table
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  plan text not null default 'starter',
  created_at timestamptz not null default now(),
  leaderboard_opt_in boolean not null default false,
  name text,
  total_tokens bigint not null default 0
);

-- API keys table
create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  hash text not null,
  prefix text not null,
  created_at timestamptz not null default now()
);

-- Detailed usage tracking (individual API calls)
create table if not exists public.usage_details (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  timestamp timestamptz not null,
  provider text not null,
  model text not null,
  prompt_tokens bigint not null default 0,
  completion_tokens bigint not null default 0,
  total_tokens bigint not null default 0,
  charged_tokens bigint not null default 0, -- Only completion tokens are charged
  request_id text,
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.users enable row level security;
alter table public.api_keys enable row level security;
alter table public.usage_details enable row level security;

-- Function to update total tokens and check plan limits
create or replace function public.update_total_tokens_and_check_limit(
  p_user_id uuid,
  p_tokens_to_add bigint
) returns boolean
language plpgsql
as $$
declare
  user_plan text;
  current_total bigint;
  plan_limit bigint;
begin
  -- Get user's plan and current total
  select plan, total_tokens into user_plan, current_total
  from public.users 
  where id = p_user_id;
  
  -- Set plan limits
  case user_plan
    when 'starter' then plan_limit := 5000;
    when 'pro' then plan_limit := 10000000;
    when 'max' then plan_limit := 2147483647; -- Max bigint value (effectively infinite)
    else plan_limit := 5000; -- default to starter
  end case;
  
  -- Check if adding tokens would exceed limit
  if current_total + p_tokens_to_add > plan_limit then
    return false; -- Would exceed limit
  end if;
  
  -- Update total tokens
  update public.users 
  set total_tokens = total_tokens + p_tokens_to_add
  where id = p_user_id;
  
  return true; -- Success
end;
$$;


