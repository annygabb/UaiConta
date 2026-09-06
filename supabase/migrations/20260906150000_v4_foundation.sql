-- UaiConta V4 — fundação de dados, recorrências, documentos e RLS.
-- Migration não destrutiva: preserva colunas monetárias antigas enquanto adiciona centavos inteiros.

begin;

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Valores monetários em centavos
-- ---------------------------------------------------------------------------

alter table public.transactions add column if not exists amount_cents bigint;
update public.transactions
set amount_cents = round(amount * 100)::bigint
where amount_cents is null;
alter table public.transactions alter column amount_cents set not null;
alter table public.transactions drop constraint if exists transactions_amount_cents_check;
alter table public.transactions add constraint transactions_amount_cents_check check (amount_cents > 0);

alter table public.accounts add column if not exists institution text;
alter table public.accounts add column if not exists color text;
alter table public.accounts add column if not exists include_in_net_worth boolean not null default true;
alter table public.accounts add column if not exists initial_balance_cents bigint;
update public.accounts
set initial_balance_cents = round(initial_balance * 100)::bigint
where initial_balance_cents is null;
alter table public.accounts alter column initial_balance_cents set default 0;
alter table public.accounts alter column initial_balance_cents set not null;

alter table public.credit_cards add column if not exists credit_limit_cents bigint;
update public.credit_cards
set credit_limit_cents = case when credit_limit is null then null else round(credit_limit * 100)::bigint end
where credit_limit_cents is null;

alter table public.income_sources add column if not exists expected_amount_cents bigint;
update public.income_sources
set expected_amount_cents = round(expected_amount * 100)::bigint
where expected_amount_cents is null;
alter table public.income_sources alter column expected_amount_cents set default 0;
alter table public.income_sources alter column expected_amount_cents set not null;

alter table public.budgets add column if not exists amount_cents bigint;
update public.budgets
set amount_cents = round(amount * 100)::bigint
where amount_cents is null;
alter table public.budgets alter column amount_cents set not null;

alter table public.goals add column if not exists target_amount_cents bigint;
alter table public.goals add column if not exists current_amount_cents bigint;
update public.goals set target_amount_cents = round(target_amount * 100)::bigint where target_amount_cents is null;
update public.goals set current_amount_cents = round(current_amount * 100)::bigint where current_amount_cents is null;
alter table public.goals alter column target_amount_cents set not null;
alter table public.goals alter column current_amount_cents set default 0;
alter table public.goals alter column current_amount_cents set not null;

alter table public.transaction_items add column if not exists unit_price_cents bigint;
alter table public.transaction_items add column if not exists total_price_cents bigint;
update public.transaction_items set unit_price_cents = round(unit_price * 100)::bigint where unit_price_cents is null;
update public.transaction_items set total_price_cents = round(total_price * 100)::bigint where total_price_cents is null;
alter table public.transaction_items alter column unit_price_cents set not null;
alter table public.transaction_items alter column total_price_cents set not null;

-- ---------------------------------------------------------------------------
-- Domínio financeiro explícito
-- ---------------------------------------------------------------------------

alter table public.transactions add column if not exists status text not null default 'completed';
alter table public.transactions drop constraint if exists transactions_status_check;
alter table public.transactions add constraint transactions_status_check check (status in ('planned','completed','cancelled'));

alter table public.transactions add column if not exists raw_description text;
alter table public.transactions add column if not exists display_description text;
update public.transactions set display_description = description where display_description is null;

create table if not exists public.recurrence_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('despesa','receita','investimento')),
  amount_cents bigint not null check (amount_cents > 0),
  description text not null check (char_length(description) between 1 and 160),
  category text not null,
  subcategory text,
  payment_method text,
  account_id uuid references public.accounts(id) on delete set null,
  credit_card_id uuid references public.credit_cards(id) on delete set null,
  frequency text not null check (frequency in ('semanal','quinzenal','mensal','anual')),
  start_date date not null,
  end_date date,
  next_occurrence_date date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or end_date >= start_date)
);

create index if not exists recurrence_rules_user_active_next_idx
on public.recurrence_rules(user_id, active, next_occurrence_date);

alter table public.transactions add column if not exists recurrence_id uuid references public.recurrence_rules(id) on delete set null;
alter table public.transactions add column if not exists occurrence_date date;
create unique index if not exists transactions_recurrence_occurrence_unique
on public.transactions(user_id, recurrence_id, occurrence_date)
where recurrence_id is not null and occurrence_date is not null;

create table if not exists public.installment_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  total_amount_cents bigint not null check (total_amount_cents > 0),
  installments_total integer not null check (installments_total between 2 and 120),
  description text not null,
  category text not null,
  payment_method text,
  credit_card_id uuid references public.credit_cards(id) on delete set null,
  first_due_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.installments add column if not exists installment_plan_id uuid references public.installment_plans(id) on delete cascade;
alter table public.installments add column if not exists amount_cents bigint;
update public.installments set amount_cents = round(amount * 100)::bigint where amount_cents is null;
alter table public.installments alter column amount_cents set not null;
create unique index if not exists installments_plan_number_unique
on public.installments(installment_plan_id, installment_number)
where installment_plan_id is not null;

-- ---------------------------------------------------------------------------
-- Notas, cupons, recibos e comprovantes
-- ---------------------------------------------------------------------------

create table if not exists public.receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  merchant_name text,
  document_type text not null default 'outro' check (document_type in ('nota_fiscal','cupom','recibo','comprovante','outro')),
  document_number text,
  document_date date,
  total_amount_cents bigint check (total_amount_cents is null or total_amount_cents >= 0),
  linked_transaction_id uuid references public.transactions(id) on delete set null,
  notes text,
  processing_status text not null default 'uploaded' check (processing_status in ('uploaded','processing','review','ready','failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.receipt_files (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references public.receipts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  original_filename text not null,
  mime_type text not null,
  file_size bigint not null check (file_size >= 0),
  page_order integer not null default 0,
  file_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, storage_path)
);

create table if not exists public.receipt_items (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references public.receipts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  description text not null,
  quantity numeric(12,3) not null default 1,
  unit text,
  unit_price_cents bigint,
  total_price_cents bigint,
  category_id uuid references public.categories(id) on delete set null,
  confidence text check (confidence in ('alta','media','baixa')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists receipts_user_date_idx on public.receipts(user_id, document_date desc, created_at desc);
create index if not exists receipts_user_merchant_idx on public.receipts(user_id, merchant_name);
create index if not exists receipt_items_receipt_idx on public.receipt_items(receipt_id);
create index if not exists receipt_items_user_description_idx on public.receipt_items(user_id, lower(description));
create unique index if not exists receipt_files_user_hash_idx on public.receipt_files(user_id, file_hash);

create table if not exists public.migration_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  local_v2_migrated_at timestamptz,
  source_count integer,
  imported_count integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- updated_at consistente
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.set_updated_at() from public;
grant execute on function public.set_updated_at() to authenticated, service_role;

DO $$
declare
  table_name text;
begin
  foreach table_name in array ARRAY[
    'profiles','accounts','credit_cards','income_sources','categories','transactions',
    'budgets','goals','subcategories','investments','user_preferences','recurrence_rules',
    'installment_plans','receipts','receipt_files','receipt_items','migration_state'
  ] loop
    execute format('drop trigger if exists set_%I_updated_at on public.%I', table_name, table_name);
    execute format('create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name, table_name);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- RLS explícito. TO authenticated + ownership em todas as entidades privadas.
-- ---------------------------------------------------------------------------

alter table public.recurrence_rules enable row level security;
alter table public.installment_plans enable row level security;
alter table public.receipts enable row level security;
alter table public.receipt_files enable row level security;
alter table public.receipt_items enable row level security;
alter table public.migration_state enable row level security;

DO $$
declare
  table_name text;
  policy_name text;
begin
  foreach table_name in array ARRAY[
    'accounts','credit_cards','income_sources','categories','transactions','transaction_items',
    'budgets','goals','pdf_imports','subcategories','recurring_transactions','installments',
    'investments','pdf_import_items','user_preferences','recurrence_rules','installment_plans',
    'receipts','receipt_files','receipt_items','migration_state'
  ] loop
    for policy_name in select policyname from pg_policies where schemaname = 'public' and tablename = table_name loop
      execute format('drop policy if exists %I on public.%I', policy_name, table_name);
    end loop;

    execute format('create policy %I on public.%I for select to authenticated using ((select auth.uid()) = user_id)', table_name || '_select_own', table_name);
    execute format('create policy %I on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', table_name || '_insert_own', table_name);
    execute format('create policy %I on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', table_name || '_update_own', table_name);
    execute format('create policy %I on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', table_name || '_delete_own', table_name);
  end loop;
end $$;

-- profiles usa id como ownership.
DO $$
declare p text;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'profiles' loop
    execute format('drop policy if exists %I on public.profiles', p);
  end loop;
end $$;
create policy profiles_select_own on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy profiles_insert_own on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy profiles_update_own on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy profiles_delete_own on public.profiles for delete to authenticated using ((select auth.uid()) = id);

-- Permissões Data API: RLS continua sendo a barreira por linha.
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- ---------------------------------------------------------------------------
-- Storage privado por usuário
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'financial-documents',
  'financial-documents',
  false,
  20971520,
  array['application/pdf','image/jpeg','image/png','image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists financial_documents_select_own on storage.objects;
drop policy if exists financial_documents_insert_own on storage.objects;
drop policy if exists financial_documents_update_own on storage.objects;
drop policy if exists financial_documents_delete_own on storage.objects;

create policy financial_documents_select_own
on storage.objects for select to authenticated
using (
  bucket_id = 'financial-documents'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy financial_documents_insert_own
on storage.objects for insert to authenticated
with check (
  bucket_id = 'financial-documents'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy financial_documents_update_own
on storage.objects for update to authenticated
using (
  bucket_id = 'financial-documents'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
)
with check (
  bucket_id = 'financial-documents'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy financial_documents_delete_own
on storage.objects for delete to authenticated
using (
  bucket_id = 'financial-documents'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

commit;
