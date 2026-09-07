import { createClient } from 'npm:@supabase/supabase-js@2.115.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
})

async function collectFiles(client: any, bucket: string, prefix: string): Promise<string[]> {
  const files: string[] = []
  let offset = 0
  const pageSize = 100

  while (true) {
    const { data, error } = await client.storage.from(bucket).list(prefix, {
      limit: pageSize,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    })
    if (error) throw error
    const entries = data || []

    for (const entry of entries) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name
      if (entry.id) files.push(path)
      else files.push(...await collectFiles(client, bucket, path))
    }

    if (entries.length < pageSize) break
    offset += pageSize
  }

  return files
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ ok: false, error: 'Método não permitido.' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const publishableKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !publishableKey || !serviceRoleKey) {
    return json({ ok: false, error: 'Função não configurada.' }, 500)
  }

  const authHeader = req.headers.get('Authorization') || ''
  const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!jwt) return json({ ok: false, error: 'Sessão ausente.' }, 401)

  const body = await req.json().catch(() => ({}))
  if (body?.confirm !== 'DELETE_MY_ACCOUNT') {
    return json({ ok: false, error: 'Confirmação inválida.' }, 400)
  }

  const userClient = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: authData, error: authError } = await userClient.auth.getUser(jwt)
  if (authError || !authData.user) return json({ ok: false, error: 'Sessão inválida ou expirada.' }, 401)
  const userId = authData.user.id

  try {
    const bucket = 'financial-documents'
    const paths = await collectFiles(admin, bucket, userId)
    for (let index = 0; index < paths.length; index += 1000) {
      const batch = paths.slice(index, index + 1000)
      const { error: removeError } = await admin.storage.from(bucket).remove(batch)
      if (removeError) throw removeError
    }

    // Revoga refresh tokens/sessões antes da remoção. Access tokens existentes expiram no TTL configurado.
    await admin.auth.admin.signOut(jwt, 'global').catch(() => undefined)

    const { error: deleteError } = await admin.auth.admin.deleteUser(userId, false)
    if (deleteError) throw deleteError

    return json({ ok: true })
  } catch (error) {
    console.error('delete-account failed', {
      userId,
      message: error instanceof Error ? error.message : 'unknown error',
    })
    return json({ ok: false, error: 'Não foi possível excluir a conta. Tente novamente.' }, 500)
  }
})
