-- UaiConta — esquema MVP escalável para Supabase/PostgreSQL
-- Execute este arquivo no SQL Editor do Supabase antes de configurar o .env.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  kind text not null default 'conta',
  initial_balance numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.credit_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  bank text,
  credit_limit numeric(14,2),
  closing_day int check (closing_day between 1 and 31),
  due_day int check (due_day between 1 and 31),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.income_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  expected_amount numeric(14,2) not null default 0,
  frequency text not null default 'mensal',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('despesa','receita','investimento')),
  color text,
  icon text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, name, type)
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('despesa','receita','investimento','transferencia')),
  amount numeric(14,2) not null check (amount > 0),
  description text not null check (char_length(description) between 1 and 160),
  category text not null,
  subcategory text,
  payment_method text,
  account_id uuid references public.accounts(id) on delete set null,
  credit_card_id uuid references public.credit_cards(id) on delete set null,
  transaction_date date not null,
  is_recurring boolean not null default false,
  notes text,
  source text not null default 'manual',
  source_file text,
  confidence text not null default 'alta' check (confidence in ('alta','media','baixa')),
  imported boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists transactions_user_date_idx on public.transactions(user_id, transaction_date desc);
create index if not exists transactions_user_type_date_idx on public.transactions(user_id, type, transaction_date desc);
create index if not exists transactions_user_category_date_idx on public.transactions(user_id, category, transaction_date desc);

create table if not exists public.transaction_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  name text not null,
  quantity numeric(12,3) not null default 1,
  unit_price numeric(14,2) not null,
  total_price numeric(14,2) not null,
  created_at timestamptz not null default now()
);

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  period_month date not null,
  amount numeric(14,2) not null check(amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, category, period_month)
);

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  target_amount numeric(14,2) not null,
  current_amount numeric(14,2) not null default 0,
  target_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pdf_imports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_name text not null,
  status text not null default 'processado',
  item_count int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.subcategories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid references public.categories(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.recurring_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('despesa','receita','investimento')),
  amount numeric(14,2) not null check (amount > 0),
  description text not null,
  category text not null,
  payment_method text,
  frequency text not null default 'mensal',
  next_run date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.installments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  transaction_id uuid references public.transactions(id) on delete cascade,
  installment_number int not null check (installment_number > 0),
  installments_total int not null check (installments_total > 0),
  due_date date not null,
  amount numeric(14,2) not null check (amount > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.investments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  kind text not null default 'outro',
  goal_id uuid references public.goals(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pdf_import_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pdf_import_id uuid not null references public.pdf_imports(id) on delete cascade,
  transaction_id uuid references public.transactions(id) on delete set null,
  raw_description text,
  confidence text check (confidence in ('alta','media','baixa')),
  created_at timestamptz not null default now()
);

create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme text not null default 'dark',
  default_period text,
  reduced_motion boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS: nenhuma linha financeira pode ser lida/modificada por outro usuário.
alter table public.profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.credit_cards enable row level security;
alter table public.income_sources enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.transaction_items enable row level security;
alter table public.budgets enable row level security;
alter table public.goals enable row level security;
alter table public.pdf_imports enable row level security;
alter table public.subcategories enable row level security;
alter table public.recurring_transactions enable row level security;
alter table public.installments enable row level security;
alter table public.investments enable row level security;
alter table public.pdf_import_items enable row level security;
alter table public.user_preferences enable row level security;

drop policy if exists "subcategories own rows" on public.subcategories;
drop policy if exists "recurring transactions own rows" on public.recurring_transactions;
drop policy if exists "installments own rows" on public.installments;
drop policy if exists "investments own rows" on public.investments;
drop policy if exists "pdf import items own rows" on public.pdf_import_items;
drop policy if exists "user preferences own rows" on public.user_preferences;
drop policy if exists "profiles own rows" on public.profiles;
drop policy if exists "accounts own rows" on public.accounts;
drop policy if exists "credit cards own rows" on public.credit_cards;
drop policy if exists "income sources own rows" on public.income_sources;
drop policy if exists "categories own rows" on public.categories;
drop policy if exists "transactions own rows" on public.transactions;
drop policy if exists "transaction items own rows" on public.transaction_items;
drop policy if exists "budgets own rows" on public.budgets;
drop policy if exists "goals own rows" on public.goals;
drop policy if exists "pdf imports own rows" on public.pdf_imports;

create policy "profiles own rows" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "accounts own rows" on public.accounts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "credit cards own rows" on public.credit_cards for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "income sources own rows" on public.income_sources for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "categories own rows" on public.categories for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "transactions own rows" on public.transactions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "transaction items own rows" on public.transaction_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "budgets own rows" on public.budgets for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "goals own rows" on public.goals for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "pdf imports own rows" on public.pdf_imports for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "subcategories own rows" on public.subcategories for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "recurring transactions own rows" on public.recurring_transactions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "installments own rows" on public.installments for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "investments own rows" on public.investments for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "pdf import items own rows" on public.pdf_import_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user preferences own rows" on public.user_preferences for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
