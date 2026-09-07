-- UaiConta V7 — índices para foreign keys e consultas relacionais.
-- A migration é aditiva e idempotente. Não remove índices existentes porque o projeto ainda
-- está formando histórico real de uso e o advisor de "unused index" pode gerar falso sinal
-- em bancos novos com pouco tráfego.

begin;

create index if not exists accounts_user_id_idx
  on public.accounts(user_id);

create index if not exists credit_cards_user_id_idx
  on public.credit_cards(user_id);

create index if not exists goals_user_id_idx
  on public.goals(user_id);

create index if not exists income_sources_user_id_idx
  on public.income_sources(user_id);

create index if not exists installment_plans_user_id_idx
  on public.installment_plans(user_id);
create index if not exists installment_plans_credit_card_id_idx
  on public.installment_plans(credit_card_id)
  where credit_card_id is not null;

create index if not exists installments_user_id_idx
  on public.installments(user_id);
create index if not exists installments_transaction_id_idx
  on public.installments(transaction_id)
  where transaction_id is not null;

create index if not exists investments_user_id_idx
  on public.investments(user_id);
create index if not exists investments_goal_id_idx
  on public.investments(goal_id)
  where goal_id is not null;

create index if not exists pdf_imports_user_id_idx
  on public.pdf_imports(user_id);

create index if not exists pdf_import_items_user_id_idx
  on public.pdf_import_items(user_id);
create index if not exists pdf_import_items_pdf_import_id_idx
  on public.pdf_import_items(pdf_import_id);
create index if not exists pdf_import_items_transaction_id_idx
  on public.pdf_import_items(transaction_id)
  where transaction_id is not null;

create index if not exists receipt_files_receipt_id_idx
  on public.receipt_files(receipt_id);

create index if not exists receipt_items_category_id_idx
  on public.receipt_items(category_id)
  where category_id is not null;

create index if not exists receipts_linked_transaction_id_idx
  on public.receipts(linked_transaction_id)
  where linked_transaction_id is not null;

create index if not exists recurrence_rules_account_id_idx
  on public.recurrence_rules(account_id)
  where account_id is not null;
create index if not exists recurrence_rules_credit_card_id_idx
  on public.recurrence_rules(credit_card_id)
  where credit_card_id is not null;

create index if not exists recurring_transactions_user_id_idx
  on public.recurring_transactions(user_id);

create index if not exists subcategories_user_id_idx
  on public.subcategories(user_id);
create index if not exists subcategories_category_id_idx
  on public.subcategories(category_id)
  where category_id is not null;

create index if not exists transaction_items_user_id_idx
  on public.transaction_items(user_id);
create index if not exists transaction_items_transaction_id_idx
  on public.transaction_items(transaction_id);

create index if not exists transactions_account_id_idx
  on public.transactions(account_id)
  where account_id is not null;
create index if not exists transactions_credit_card_id_idx
  on public.transactions(credit_card_id)
  where credit_card_id is not null;
create index if not exists transactions_recurrence_id_idx
  on public.transactions(recurrence_id)
  where recurrence_id is not null;

commit;
