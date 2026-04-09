-- Supabase SQL migration for Risk-Dashboard-UI
-- Run this in the Supabase SQL Editor (or via migration tooling).

-- Extensions
create extension if not exists "pgcrypto";

-- =========================================================
-- Profiles (stores the large bankerProfile JSON from Profile page)
-- =========================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  banker_profile jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (id = auth.uid());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- Create a profile row automatically on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Timestamp helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

-- =========================================================
-- Risk Assessments (drives Dashboard / Risk Engine / Alerts)
-- =========================================================
create table if not exists public.risk_assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  input_data jsonb not null,
  risk_score integer not null check (risk_score >= 0 and risk_score <= 100),
  risk_level text not null check (risk_level in ('Low','Medium','High','Critical')),
  recommendation text not null,
  created_at timestamptz not null default now()
);

create index if not exists risk_assessments_user_created_idx
  on public.risk_assessments (user_id, created_at desc);

alter table public.risk_assessments enable row level security;

drop policy if exists "risk_assessments_select_own" on public.risk_assessments;
create policy "risk_assessments_select_own"
on public.risk_assessments
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "risk_assessments_insert_own" on public.risk_assessments;
create policy "risk_assessments_insert_own"
on public.risk_assessments
for insert
to authenticated
with check (user_id = auth.uid());

-- Optional: allow delete/update of own rows
drop policy if exists "risk_assessments_delete_own" on public.risk_assessments;
create policy "risk_assessments_delete_own"
on public.risk_assessments
for delete
to authenticated
using (user_id = auth.uid());

-- =========================================================
-- Portfolio (Portfolio page)
-- =========================================================
create table if not exists public.portfolio_allocations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  value numeric not null check (value >= 0 and value <= 100),
  color text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists portfolio_allocations_user_sort_idx
  on public.portfolio_allocations (user_id, sort_order);

alter table public.portfolio_allocations enable row level security;

drop policy if exists "portfolio_allocations_select_own" on public.portfolio_allocations;
create policy "portfolio_allocations_select_own"
on public.portfolio_allocations
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "portfolio_allocations_write_own" on public.portfolio_allocations;
create policy "portfolio_allocations_write_own"
on public.portfolio_allocations
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop trigger if exists set_portfolio_allocations_updated_at on public.portfolio_allocations;
create trigger set_portfolio_allocations_updated_at
before update on public.portfolio_allocations
for each row execute procedure public.set_updated_at();

create table if not exists public.portfolio_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  type text not null,
  balance numeric not null default 0,
  status text not null default 'Active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists portfolio_accounts_user_created_idx
  on public.portfolio_accounts (user_id, created_at desc);

alter table public.portfolio_accounts enable row level security;

drop policy if exists "portfolio_accounts_select_own" on public.portfolio_accounts;
create policy "portfolio_accounts_select_own"
on public.portfolio_accounts
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "portfolio_accounts_write_own" on public.portfolio_accounts;
create policy "portfolio_accounts_write_own"
on public.portfolio_accounts
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop trigger if exists set_portfolio_accounts_updated_at on public.portfolio_accounts;
create trigger set_portfolio_accounts_updated_at
before update on public.portfolio_accounts
for each row execute procedure public.set_updated_at();

-- =========================================================
-- Transactions (Transactions page)
-- =========================================================
create table if not exists public.transactions (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date date not null,
  merchant text not null,
  category text not null,
  amount numeric not null,
  channel text not null,
  status text not null,
  risk_flag text not null check (risk_flag in ('Low','Medium','High','Critical')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists transactions_user_date_idx
  on public.transactions (user_id, date desc);

alter table public.transactions enable row level security;

drop policy if exists "transactions_select_own" on public.transactions;
create policy "transactions_select_own"
on public.transactions
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "transactions_write_own" on public.transactions;
create policy "transactions_write_own"
on public.transactions
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop trigger if exists set_transactions_updated_at on public.transactions;
create trigger set_transactions_updated_at
before update on public.transactions
for each row execute procedure public.set_updated_at();
--insert policy for transactions table in which only the owner can access their transactions
-- =========================================================
-- Optional seed data (run after you sign up and are logged in)
-- NOTE: This uses auth.uid(), so it only works inside a Supabase session-aware context
-- (e.g., via client inserts) OR if you replace auth.uid() with your own user UUID.
-- =========================================================
-- Example seeds (uncomment and replace <YOUR_USER_UUID>)
-- insert into public.portfolio_allocations (user_id, name, value, color, sort_order) values
--   ('<YOUR_USER_UUID>', 'Cash & Equivalents', 18, '#60a5fa', 1),
--   ('<YOUR_USER_UUID>', 'Investment Grade Bonds', 32, '#93c5fd', 2),
--   ('<YOUR_USER_UUID>', 'Equities (Large Cap)', 28, '#3b82f6', 3),
--   ('<YOUR_USER_UUID>', 'Equities (Intl)', 12, '#1d4ed8', 4),
--   ('<YOUR_USER_UUID>', 'Alternatives', 10, '#0ea5e9', 5);
--
-- insert into public.portfolio_accounts (user_id, name, type, balance, status) values
--   ('<YOUR_USER_UUID>', 'Primary Checking', 'Deposit', 18420.12, 'Active'),
--   ('<YOUR_USER_UUID>', 'High Yield Savings', 'Deposit', 65250.44, 'Active'),
--   ('<YOUR_USER_UUID>', 'Brokerage', 'Investment', 214980.55, 'Active'),
--   ('<YOUR_USER_UUID>', 'Credit Line', 'Credit', -8200.00, 'Open');
--
-- insert into public.transactions (id, user_id, date, merchant, category, amount, channel, status, risk_flag) values
--   ('TX-10921', '<YOUR_USER_UUID>', '2026-01-20', 'Global Electronics', 'Electronics', 1989.25, 'Card Present', 'Posted', 'Low'),
--   ('TX-10920', '<YOUR_USER_UUID>', '2026-01-20', 'Atlas Travel', 'Travel', 7420.00, 'E-commerce', 'Pending', 'Medium'),
--   ('TX-10919', '<YOUR_USER_UUID>', '2026-01-19', 'Crypto Exchange', 'Crypto', 12000.00, 'E-commerce', 'Review', 'High'),
--   ('TX-10918', '<YOUR_USER_UUID>', '2026-01-18', 'Retail Mart', 'Retail', 245.90, 'Card Present', 'Posted', 'Low');
