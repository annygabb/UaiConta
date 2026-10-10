import { createClient } from 'npm:@supabase/supabase-js@2.115.0'

Deno.serve(async (request) => {
  if (request.method !== 'POST' || request.headers.get('x-cron-secret') !== Deno.env.get('CRON_SECRET')) return new Response('Forbidden', { status: 403 })
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
  const { data: batches, error } = await admin.rpc('claim_abandoned_receipt_imports', { p_limit: 100 })
  if (error) return new Response(JSON.stringify({ error: 'Falha ao consultar lotes.' }), { status: 500, headers: { 'content-type': 'application/json' } })
  let removed = 0
  for (const batch of batches || []) {
    const { data: objects, error: listError } = await admin.storage.from('financial-documents').list(batch.storage_prefix.replace(/\/$/, ''), { limit: 1000 })
    if (listError) { await admin.from('receipt_import_batches').update({ status: 'prepared', cleanup_claimed_at: null }).eq('id', batch.id).eq('status', 'cleaning'); continue }
    const paths = (objects || []).map((object) => `${batch.storage_prefix}${object.name}`)
    if (paths.length) { const { error: storageError } = await admin.storage.from('financial-documents').remove(paths); if (storageError) { await admin.from('receipt_import_batches').update({ status: 'prepared', cleanup_claimed_at: null }).eq('id', batch.id).eq('status', 'cleaning'); continue } }
    const { error: deleteError } = await admin.from('receipt_import_batches').delete().eq('id', batch.id).eq('status', 'cleaning')
    if (!deleteError) removed += 1
    else await admin.from('receipt_import_batches').update({ status: 'prepared', cleanup_claimed_at: null }).eq('id', batch.id).eq('status', 'cleaning')
  }
  return new Response(JSON.stringify({ removed }), { headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } })
})
