begin;

alter table public.receipts add column if not exists import_batch_id uuid;
alter table public.receipts add column if not exists import_payload_hash text;
create unique index if not exists receipts_import_batch_unique on public.receipts(user_id, import_batch_id) where import_batch_id is not null;

create table if not exists public.receipt_import_batches (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  payload_hash text not null,
  storage_prefix text not null,
  status text not null default 'prepared' check(status in ('prepared','cleaning','finalized')),
  cleanup_claimed_at timestamptz,
  created_at timestamptz not null default now(),
  finalized_at timestamptz
);
alter table public.receipt_import_batches enable row level security;
revoke all on public.receipt_import_batches from anon,authenticated;
grant all on public.receipt_import_batches to service_role;

create or replace function public.prepare_receipt_import(p_batch_id uuid,p_payload_hash text)
returns void language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); existing text;
begin
  if uid is null then raise exception 'Usuário não autenticado'; end if;
  select payload_hash into existing from public.receipt_import_batches where id=p_batch_id and user_id=uid for update;
  if existing is not null and existing<>p_payload_hash then raise exception 'Este lote já foi preparado com outro conteúdo'; end if;
  insert into public.receipt_import_batches(id,user_id,payload_hash,storage_prefix) values(p_batch_id,uid,p_payload_hash,uid::text||'/receipts/pending/'||p_batch_id::text||'/')
  on conflict(id) do nothing;
end $$;
revoke all on function public.prepare_receipt_import(uuid,text) from public,anon;
grant execute on function public.prepare_receipt_import(uuid,text) to authenticated;

create or replace function public.claim_abandoned_receipt_imports(p_limit integer default 100)
returns table(id uuid,storage_prefix text) language plpgsql security invoker set search_path=public as $$
begin
  return query with selected as (
    select b.id from public.receipt_import_batches b where
      (b.status='prepared' and b.created_at<now()-interval '24 hours')
      or (b.status='cleaning' and b.cleanup_claimed_at<now()-interval '15 minutes')
    order by b.created_at for update skip locked limit greatest(1,least(p_limit,100))
  )
  update public.receipt_import_batches b set status='cleaning',cleanup_claimed_at=now() from selected s where b.id=s.id returning b.id,b.storage_prefix;
end $$;
revoke all on function public.claim_abandoned_receipt_imports(integer) from public,anon,authenticated;
grant execute on function public.claim_abandoned_receipt_imports(integer) to service_role;

-- Vínculos nunca armazenam o telefone em texto aberto: somente hash com pepper
-- do servidor e os quatro últimos dígitos para identificação visual.
create table if not exists public.whatsapp_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  phone_hash text not null unique,
  phone_last4 text not null check (phone_last4 ~ '^\d{4}$'),
  active boolean not null default true,
  paired_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id)
);

create table if not exists public.whatsapp_pairing_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  code_hash text not null unique,
  code_selector text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  external_id text not null unique,
  direction text not null check (direction in ('inbound','outbound')),
  message_type text not null,
  processing_status text not null default 'received' check (processing_status in ('received','processing','processed','failed','duplicate')),
  metadata jsonb not null default '{}'::jsonb,
  storage_path text,
  media_hash text,
  media_mime_type text,
  media_size bigint,
  claimed_at timestamptz,
  attempts integer not null default 0,
  result_payload jsonb,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create table if not exists public.financial_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_message_id uuid references public.whatsapp_messages(id) on delete set null,
  status text not null default 'awaiting_confirmation' check (status in ('awaiting_confirmation','awaiting_correction','awaiting_conflict','confirmed','ignored','failed')),
  type text not null check (type in ('despesa','receita')),
  amount_cents bigint check (amount_cents is null or amount_cents > 0),
  description text not null check (char_length(description) between 1 and 160),
  transaction_date date not null,
  category text not null default 'Não categorizado',
  payment_method text not null default 'Não identificado',
  confidence text not null default 'baixa' check (confidence in ('alta','media','baixa')),
  version integer not null default 1,
  linked_transaction_id uuid references public.transactions(id) on delete set null,
  conflicts_with_draft_id uuid references public.financial_drafts(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists financial_drafts_open_user_idx
on public.financial_drafts(user_id, created_at desc) where status in ('awaiting_confirmation','awaiting_correction','awaiting_conflict');

create table if not exists public.draft_corrections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  draft_id uuid not null references public.financial_drafts(id) on delete cascade,
  previous_data jsonb not null,
  changed_fields text[] not null default '{}',
  created_at timestamptz not null default now()
);
create unique index if not exists financial_drafts_source_message_unique on public.financial_drafts(source_message_id) where source_message_id is not null;
create index if not exists whatsapp_pairing_selector_active_idx on public.whatsapp_pairing_codes(code_selector,expires_at) where used_at is null;

update storage.buckets set file_size_limit=26214400, allowed_mime_types=array['application/pdf','image/jpeg','image/png','image/webp','audio/ogg','audio/mpeg','audio/mp4','audio/aac','audio/wav','audio/webm'] where id='financial-documents';

create table if not exists public.whatsapp_pairing_attempts (
  phone_hash text primary key,
  attempts integer not null default 0,
  window_started_at timestamptz not null default now(),
  blocked_until timestamptz
);

alter table public.whatsapp_links enable row level security;
alter table public.whatsapp_pairing_codes enable row level security;
alter table public.whatsapp_messages enable row level security;
alter table public.financial_drafts enable row level security;
alter table public.draft_corrections enable row level security;
alter table public.whatsapp_pairing_attempts enable row level security;

do $$
declare table_name text;
begin
  foreach table_name in array array['whatsapp_links','whatsapp_pairing_codes','whatsapp_messages','financial_drafts','draft_corrections'] loop
    execute format('create policy %I on public.%I for select to authenticated using ((select auth.uid()) = user_id)', table_name || '_select_own', table_name);
  end loop;
end $$;

revoke all on public.whatsapp_links, public.whatsapp_pairing_codes, public.whatsapp_messages, public.financial_drafts, public.draft_corrections, public.whatsapp_pairing_attempts from anon, authenticated;
grant select on public.whatsapp_links to authenticated;
grant select on public.whatsapp_messages, public.financial_drafts, public.draft_corrections to authenticated;
grant all on public.whatsapp_links, public.whatsapp_pairing_codes, public.whatsapp_messages, public.financial_drafts, public.draft_corrections, public.whatsapp_pairing_attempts to service_role;

create or replace function public.disconnect_whatsapp()
returns void language sql security definer set search_path=public as $$
  update public.whatsapp_links set active=false,updated_at=now() where user_id=auth.uid();
$$;
revoke all on function public.disconnect_whatsapp() from public,anon;
grant execute on function public.disconnect_whatsapp() to authenticated;

create or replace function public.create_whatsapp_pairing_code()
returns table(code text, expires_at timestamptz) language plpgsql security definer set search_path=public,extensions as $$
declare uid uuid:=auth.uid(); candidate text; selector text; random_value bigint;
begin
  if uid is null then raise exception 'Usuário não autenticado'; end if;
  if exists(select 1 from public.whatsapp_pairing_codes where user_id=uid and created_at>now()-interval '1 minute') then raise exception 'Aguarde um minuto para gerar outro código'; end if;
  delete from public.whatsapp_pairing_codes as pairing_code
  where pairing_code.user_id=uid or pairing_code.expires_at<now()-interval '1 day';
  random_value:=('x'||encode(gen_random_bytes(4),'hex'))::bit(32)::bigint;
  selector:=lpad((random_value%100)::text,2,'0');
  candidate:=selector||lpad(((random_value/100)%1000000)::text,6,'0');
  insert into public.whatsapp_pairing_codes(user_id,code_hash,code_selector,expires_at) values(uid,crypt(candidate,gen_salt('bf')),selector,now()+interval '10 minutes');
  return query select candidate,now()+interval '10 minutes';
end $$;
revoke all on function public.create_whatsapp_pairing_code() from public,anon;
grant execute on function public.create_whatsapp_pairing_code() to authenticated;

create or replace function public.consume_whatsapp_pairing_code(p_message_id uuid,p_code text,p_phone_hash text,p_last4 text)
returns uuid language plpgsql security definer set search_path=public,extensions as $$
declare selected public.whatsapp_pairing_codes%rowtype; attempt public.whatsapp_pairing_attempts%rowtype;
begin
  insert into public.whatsapp_pairing_attempts(phone_hash,attempts,window_started_at)
  values(p_phone_hash,1,now()) on conflict(phone_hash) do update set
    attempts=case when whatsapp_pairing_attempts.window_started_at<now()-interval '15 minutes' then 1 else whatsapp_pairing_attempts.attempts+1 end,
    window_started_at=case when whatsapp_pairing_attempts.window_started_at<now()-interval '15 minutes' then now() else whatsapp_pairing_attempts.window_started_at end,
    blocked_until=case when whatsapp_pairing_attempts.attempts>=9 and whatsapp_pairing_attempts.window_started_at>=now()-interval '15 minutes' then now()+interval '15 minutes' else whatsapp_pairing_attempts.blocked_until end
  returning * into attempt;
  if attempt.blocked_until is not null and attempt.blocked_until>now() then return null; end if;
  if p_code !~ '^[0-9]{8}$' then return null; end if;
  select * into selected from public.whatsapp_pairing_codes where code_selector=left(p_code,2) and used_at is null and expires_at>now() and code_hash=crypt(p_code,code_hash) order by created_at desc limit 1 for update skip locked;
  if selected.id is null then return null; end if;
  update public.whatsapp_pairing_codes set used_at=now() where id=selected.id and used_at is null;
  delete from public.whatsapp_links where phone_hash=p_phone_hash or user_id=selected.user_id;
  insert into public.whatsapp_links(user_id,phone_hash,phone_last4,active) values(selected.user_id,p_phone_hash,p_last4,true);
  delete from public.whatsapp_pairing_attempts where phone_hash=p_phone_hash;
  update public.whatsapp_messages set user_id=selected.user_id,result_payload=jsonb_build_object('kind','paired') where id=p_message_id;
  return selected.user_id;
end $$;
revoke all on function public.consume_whatsapp_pairing_code(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.consume_whatsapp_pairing_code(uuid,text,text,text) to service_role;

create or replace function public.claim_whatsapp_message(p_user_id uuid,p_external_id text,p_message_type text,p_metadata jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare mid uuid; current_status text; last_claim timestamptz;
begin
  insert into public.whatsapp_messages(user_id,external_id,direction,message_type,processing_status,metadata,claimed_at,attempts)
  values(p_user_id,p_external_id,'inbound',p_message_type,'processing',coalesce(p_metadata,'{}'::jsonb),now(),1)
  on conflict(external_id) do nothing returning id into mid;
  if mid is not null then return jsonb_build_object('state','claimed','id',mid); end if;
  select id,processing_status,claimed_at into mid,current_status,last_claim from public.whatsapp_messages where external_id=p_external_id for update;
  if current_status='processed' then return jsonb_build_object('state','processed','id',mid); end if;
  if current_status='processing' and last_claim>now()-interval '2 minutes' then return jsonb_build_object('state','busy','id',mid); end if;
  update public.whatsapp_messages set user_id=coalesce(user_id,p_user_id),processing_status='processing',claimed_at=now(),attempts=attempts+1 where id=mid;
  return jsonb_build_object('state','claimed','id',mid);
end $$;
revoke all on function public.claim_whatsapp_message(uuid,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.claim_whatsapp_message(uuid,text,text,jsonb) to service_role;

create or replace function public.create_whatsapp_draft(p_message_id uuid,p_user_id uuid,p_draft jsonb)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare result jsonb; prior uuid; did uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text,0));
  select result_payload into result from public.whatsapp_messages where id=p_message_id and user_id=p_user_id for update;
  if result is not null then return result; end if;
  select id into did from public.financial_drafts where source_message_id=p_message_id;
  if did is not null then result:=jsonb_build_object('kind','draft','draft_id',did); update public.whatsapp_messages set result_payload=result where id=p_message_id; return result; end if;
  select id into prior from public.financial_drafts where user_id=p_user_id and status in ('awaiting_confirmation','awaiting_correction','awaiting_conflict') order by created_at desc limit 1 for update;
  insert into public.financial_drafts(user_id,source_message_id,status,conflicts_with_draft_id,type,amount_cents,description,transaction_date,category,payment_method,confidence)
  values(p_user_id,p_message_id,case when prior is null then 'awaiting_confirmation' else 'awaiting_conflict' end,prior,p_draft->>'type',nullif(p_draft->>'amount_cents','')::bigint,left(p_draft->>'description',160),(p_draft->>'transaction_date')::date,coalesce(p_draft->>'category','Não categorizado'),coalesce(p_draft->>'payment_method','Não identificado'),coalesce(p_draft->>'confidence','baixa')) returning id into did;
  result:=jsonb_build_object('kind',case when prior is null then 'draft' else 'conflict' end,'draft_id',did);
  update public.whatsapp_messages set result_payload=result where id=p_message_id;
  return result;
end $$;
revoke all on function public.create_whatsapp_draft(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.create_whatsapp_draft(uuid,uuid,jsonb) to service_role;

-- Chamado somente pela Edge Function com service_role. Confirma uma única vez,
-- cria a movimentação e fecha o rascunho na mesma transação do banco.
create or replace function public.confirm_whatsapp_draft(p_draft_id uuid)
returns uuid language plpgsql security invoker set search_path = public as $$
declare d public.financial_drafts%rowtype; transaction_id uuid;
begin
  select * into d from public.financial_drafts where id = p_draft_id for update;
  if d.id is null then raise exception 'Rascunho não encontrado'; end if;
  if d.status = 'confirmed' and d.linked_transaction_id is not null then return d.linked_transaction_id; end if;
  if d.status <> 'awaiting_confirmation' or d.amount_cents is null then return null; end if;
  insert into public.transactions(user_id,type,amount,amount_cents,description,display_description,category,payment_method,transaction_date,status,is_recurring,source,confidence,imported)
  values(d.user_id,d.type,d.amount_cents/100.0,d.amount_cents,d.description,d.description,d.category,d.payment_method,d.transaction_date,'completed',false,'whatsapp',d.confidence,true)
  returning id into transaction_id;
  update public.financial_drafts set status='confirmed', linked_transaction_id=transaction_id, updated_at=now() where id=d.id;
  return transaction_id;
end $$;

revoke all on function public.confirm_whatsapp_draft(uuid) from public, anon, authenticated;
grant execute on function public.confirm_whatsapp_draft(uuid) to service_role;

create or replace function public.transition_whatsapp_draft(p_draft_id uuid,p_action text,p_patch jsonb default '{}'::jsonb)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare d public.financial_drafts%rowtype; changed text[]:=array[]::text[];
begin
  select * into d from public.financial_drafts where id=p_draft_id for update;
  if d.id is null then return null; end if;
  if p_action='ignore' and d.status in ('awaiting_confirmation','awaiting_conflict') then update public.financial_drafts set status='ignored',updated_at=now() where id=d.id;
  elsif p_action='request_correction' and d.status in ('awaiting_confirmation','awaiting_conflict') then update public.financial_drafts set status='awaiting_correction',updated_at=now() where id=d.id;
  elsif p_action='keep_both' and d.status='awaiting_conflict' then update public.financial_drafts set status='awaiting_confirmation',updated_at=now() where id=d.id;
  elsif p_action='replace' and d.status='awaiting_conflict' then
    update public.financial_drafts set status='ignored',updated_at=now() where id=d.conflicts_with_draft_id and status in ('awaiting_confirmation','awaiting_correction');
    update public.financial_drafts set status='awaiting_confirmation',updated_at=now() where id=d.id;
  elsif p_action='correct' and d.status='awaiting_correction' then
    if p_patch ? 'amount_cents' then changed:=array_append(changed,'amount_cents'); end if;
    if p_patch ? 'transaction_date' then changed:=array_append(changed,'transaction_date'); end if;
    if p_patch ? 'category' then changed:=array_append(changed,'category'); end if;
    if p_patch ? 'description' then changed:=array_append(changed,'description'); end if;
    insert into public.draft_corrections(user_id,draft_id,previous_data,changed_fields) values(d.user_id,d.id,to_jsonb(d),changed);
    update public.financial_drafts set
      amount_cents=case when p_patch?'amount_cents' then (p_patch->>'amount_cents')::bigint else amount_cents end,
      transaction_date=case when p_patch?'transaction_date' then (p_patch->>'transaction_date')::date else transaction_date end,
      category=case when p_patch?'category' then left(p_patch->>'category',160) else category end,
      description=case when p_patch?'description' then left(p_patch->>'description',160) else description end,
      status='awaiting_confirmation',version=version+1,updated_at=now() where id=d.id;
  end if;
  return (select to_jsonb(x) from public.financial_drafts x where x.id=d.id);
end $$;
revoke all on function public.transition_whatsapp_draft(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.transition_whatsapp_draft(uuid,text,jsonb) to service_role;

create or replace function public.process_whatsapp_command(p_message_id uuid,p_user_id uuid,p_command text,p_patch jsonb default '{}'::jsonb)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare result jsonb; d public.financial_drafts%rowtype; tid uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text,0));
  select result_payload into result from public.whatsapp_messages where id=p_message_id and user_id=p_user_id for update;
  if result is not null then return result; end if;
  select * into d from public.financial_drafts where user_id=p_user_id and status in ('awaiting_confirmation','awaiting_correction','awaiting_conflict') order by created_at desc limit 1 for update;
  if d.id is null then result:=jsonb_build_object('kind','no_pending');
  elsif d.status='awaiting_conflict' then
    if p_command='1' then perform public.transition_whatsapp_draft(d.id,'keep_both','{}'); result:=jsonb_build_object('kind','kept_both','draft_id',d.id);
    elsif p_command='2' then perform public.transition_whatsapp_draft(d.id,'ignore','{}'); result:=jsonb_build_object('kind','ignored_new');
    elsif p_command='3' then perform public.transition_whatsapp_draft(d.id,'replace','{}'); result:=jsonb_build_object('kind','replaced','draft_id',d.id);
    elsif p_command='4' then perform public.transition_whatsapp_draft(d.id,'request_correction','{}'); result:=jsonb_build_object('kind','request_correction');
    else result:=jsonb_build_object('kind','conflict_options'); end if;
  elsif d.status='awaiting_correction' then
    result:=jsonb_build_object('kind','corrected','draft',public.transition_whatsapp_draft(d.id,'correct',p_patch));
  elsif p_command='1' then
    tid:=public.confirm_whatsapp_draft(d.id); result:=jsonb_build_object('kind',case when tid is null then 'stale' else 'confirmed' end,'transaction_id',tid);
  elsif p_command='2' then perform public.transition_whatsapp_draft(d.id,'ignore','{}'); result:=jsonb_build_object('kind','ignored');
  elsif p_command='3' then perform public.transition_whatsapp_draft(d.id,'request_correction','{}'); result:=jsonb_build_object('kind','request_correction');
  else result:=jsonb_build_object('kind','not_command'); end if;
  update public.whatsapp_messages set result_payload=result where id=p_message_id;
  return result;
end $$;
revoke all on function public.process_whatsapp_command(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.process_whatsapp_command(uuid,uuid,text,jsonb) to service_role;

create or replace function public.dispatch_whatsapp_text(p_message_id uuid,p_user_id uuid,p_text text,p_draft jsonb,p_patch jsonb default '{}'::jsonb)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare result jsonb; open_status text;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text,0));
  select result_payload into result from public.whatsapp_messages where id=p_message_id and user_id=p_user_id for update;
  if result is not null then return result; end if;
  select status into open_status from public.financial_drafts where user_id=p_user_id and status in ('awaiting_confirmation','awaiting_correction','awaiting_conflict') order by created_at desc limit 1 for update;
  if p_text ~ '^[1-4]$' or open_status='awaiting_correction' then
    return public.process_whatsapp_command(p_message_id,p_user_id,p_text,p_patch);
  end if;
  return public.create_whatsapp_draft(p_message_id,p_user_id,p_draft);
end $$;
revoke all on function public.dispatch_whatsapp_text(uuid,uuid,text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.dispatch_whatsapp_text(uuid,uuid,text,jsonb,jsonb) to service_role;

-- Confirma nota, itens, arquivo já armazenado e movimentação em uma operação.
create or replace function public.confirm_receipt_import(p_receipt jsonb, p_items jsonb, p_files jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); rid uuid := gen_random_uuid(); tid uuid; item jsonb; file_data jsonb; batch uuid := (p_receipt->>'import_batch_id')::uuid; payload_hash text:=p_receipt->>'import_payload_hash'; stored_hash text; batch_row public.receipt_import_batches%rowtype;
begin
  if uid is null then raise exception 'Usuário não autenticado'; end if;
  select * into batch_row from public.receipt_import_batches where id=batch and user_id=uid for update;
  if batch_row.id is null or batch_row.payload_hash<>payload_hash or batch_row.storage_prefix<>uid::text||'/receipts/pending/'||batch::text||'/' then raise exception 'Lote não preparado ou manifesto divergente'; end if;
  select id,import_payload_hash into rid,stored_hash from public.receipts where user_id=uid and import_batch_id=batch;
  if rid is not null and stored_hash=payload_hash then return rid; end if;
  if rid is not null then raise exception 'O lote já foi finalizado com outro conteúdo'; end if;
  if batch_row.status<>'prepared' then raise exception 'Lote não está disponível para finalização'; end if;
  rid:=gen_random_uuid();
  insert into public.transactions(user_id,type,amount,amount_cents,description,display_description,category,payment_method,transaction_date,status,is_recurring,source,confidence,imported)
  values(uid,'despesa',(p_receipt->>'total_amount_cents')::bigint/100.0,(p_receipt->>'total_amount_cents')::bigint,coalesce(p_receipt->>'merchant_name','Compra importada'),coalesce(p_receipt->>'merchant_name','Compra importada'),coalesce(p_receipt->>'category','Não categorizado'),coalesce(p_receipt->>'payment_method','Não identificado'),(p_receipt->>'document_date')::date,'completed',false,'receipt','media',true)
  returning id into tid;
  insert into public.receipts(id,user_id,import_batch_id,import_payload_hash,merchant_name,document_type,document_date,total_amount_cents,linked_transaction_id,notes,processing_status)
  values(rid,uid,batch,payload_hash,p_receipt->>'merchant_name',coalesce(p_receipt->>'document_type','nota_fiscal'),(p_receipt->>'document_date')::date,(p_receipt->>'total_amount_cents')::bigint,tid,nullif(p_receipt->>'notes',''), 'ready');
  for item in select * from jsonb_array_elements(coalesce(p_items,'[]'::jsonb)) loop
    insert into public.receipt_items(receipt_id,user_id,description,quantity,unit_price_cents,total_price_cents,confidence)
    values(rid,uid,item->>'description',coalesce((item->>'quantity')::numeric,1),nullif(item->>'unit_price_cents','')::bigint,(item->>'total_price_cents')::bigint,coalesce(item->>'confidence','media'));
  end loop;
  for file_data in select * from jsonb_array_elements(coalesce(p_files,'[]'::jsonb)) loop
    if (file_data->>'storage_path') not like batch_row.storage_prefix||'%' then raise exception 'Caminho de arquivo fora do lote'; end if;
    insert into public.receipt_files(receipt_id,user_id,storage_path,original_filename,mime_type,file_size,page_order,file_hash)
    values(rid,uid,file_data->>'storage_path',file_data->>'original_filename',file_data->>'mime_type',(file_data->>'file_size')::bigint,coalesce((file_data->>'page_order')::int,0),file_data->>'file_hash');
  end loop;
  update public.receipt_import_batches set status='finalized',finalized_at=now() where id=batch;
  return rid;
end $$;

revoke all on function public.confirm_receipt_import(jsonb,jsonb,jsonb) from public, anon;
grant execute on function public.confirm_receipt_import(jsonb,jsonb,jsonb) to authenticated;

commit;
