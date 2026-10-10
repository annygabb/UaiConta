begin;
select plan(16);

insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at)
values
('11111111-1111-4111-8111-111111111111','00000000-0000-0000-0000-000000000000','authenticated','authenticated','one@example.test','',now(),now(),now()),
('22222222-2222-4222-8222-222222222222','00000000-0000-0000-0000-000000000000','authenticated','authenticated','two@example.test','',now(),now(),now());

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
select lives_ok($$select public.prepare_receipt_import('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','manifest-a')$$,'prepara lote próprio');
select throws_ok($$select public.prepare_receipt_import('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','manifest-b')$$,'P0001','Este lote já foi preparado com outro conteúdo','rejeita manifesto divergente');
create temp table issued_code as select * from public.create_whatsapp_pairing_code();
select matches((select code from issued_code),'^[0-9]{8}$','gera código criptográfico com seletor');
select set_config('test.pairing_code',(select code from issued_code),false);

set local role postgres;
select is((select storage_prefix from public.receipt_import_batches where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), '11111111-1111-4111-8111-111111111111/receipts/pending/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/','prefixo vem do usuário autenticado');
update public.receipt_import_batches set created_at=now()-interval '25 hours' where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
set local role service_role;
select is((select count(*)::int from public.claim_abandoned_receipt_imports(10)),1,'claim seleciona lote expirado uma vez');
select is((select count(*)::int from public.claim_abandoned_receipt_imports(10)),0,'claim não repete lote em limpeza');
set local role postgres;
update public.receipt_import_batches set cleanup_claimed_at=now()-interval '16 minutes' where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
set local role service_role;
select is((select count(*)::int from public.claim_abandoned_receipt_imports(10)),1,'claim recupera lote cuja limpeza perdeu o lease');

select is(public.claim_whatsapp_message(null,'wamid.pair','text','{}')->>'state','claimed','claim aceita remetente ainda não vinculado');
select is(public.claim_whatsapp_message(null,'wamid.pair','text','{}')->>'state','busy','retry durante lease informa worker ocupado');
select isnt(public.consume_whatsapp_pairing_code((select id from public.whatsapp_messages where external_id='wamid.pair'),current_setting('test.pairing_code'),'phone-hash-one','9999'),null::uuid,'consome código e cria vínculo');
select is((select result_payload->>'kind' from public.whatsapp_messages where external_id='wamid.pair'),'paired','resultado do pareamento fica persistido no inbox');
select is(public.consume_whatsapp_pairing_code((select id from public.whatsapp_messages where external_id='wamid.pair'),current_setting('test.pairing_code'),'phone-hash-one','9999'),null::uuid,'código não pode ser reutilizado');
update public.whatsapp_messages set processing_status='processed',processed_at=now() where external_id='wamid.pair';
select is(public.claim_whatsapp_message(null,'wamid.pair','text','{}')->>'state','processed','replay concluído não reprocessa a mensagem');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
select lives_ok($$select public.prepare_receipt_import('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','manifest-receipt')$$,'prepara lote para confirmação');
select lives_ok($$
  select public.confirm_receipt_import(
    '{"import_batch_id":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","import_payload_hash":"manifest-receipt","merchant_name":"Loja Teste","document_type":"nota_fiscal","document_date":"2026-10-10","total_amount_cents":1000,"category":"Supermercado","payment_method":"Pix","notes":"Teste"}'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb
  )
$$,'usuário autenticado confirma lote próprio');
select is(
  public.confirm_receipt_import(
    '{"import_batch_id":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","import_payload_hash":"manifest-receipt","merchant_name":"Loja Teste","document_type":"nota_fiscal","document_date":"2026-10-10","total_amount_cents":1000,"category":"Supermercado","payment_method":"Pix","notes":"Teste"}'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb
  ),
  (select id from public.receipts where import_batch_id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
  'retry pós-finalização retorna o mesmo recibo'
);

select * from finish();
rollback;
