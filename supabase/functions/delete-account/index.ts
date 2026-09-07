import { createClient } from 'npm:@supabase/supabase-js@2.115.0'

const DEFAULT_ALLOWED_ORIGINS = new Set([
  'https://uaiconta.vercel.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
])

const configuredOrigins = (Deno.env.get('ALLOWED_ORIGINS') || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean)

const allowedOrigins = new Set([...DEFAULT_ALLOWED_ORIGINS, ...configuredOrigins])

function isAllowedOrigin(origin: string) {
  if (!origin) return true
  if (allowedOrigins.has(origin)) return true
  return /^https:\/\/uaiconta-[a-z0-9-]+-annygabbyoficial-5107s-projects\.vercel\.app$/i.test(origin)
}

function responseHeaders(origin: string) {
  return {
    'Access-Control-Allow-Origin': origin || 'https://uaiconta.vercel.app',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '600',
    'Cache-Control': 'no-store',
    'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
    'Referrer-Policy': 'no-referrer',
    'Vary': 'Origin',
    'X-Content-Type-Options': 'nosniff',
  }
}

const json = (body: unknown, origin: string, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...responseHeaders(origin), 'Content-Type': 'application/json; charset=utf-8' },
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
  const origin = req.headers.get('Origin') || ''
  if (!isAllowedOrigin(origin)) return json({ ok: false, error: 'Origem não permitida.' }, origin, 403)

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: responseHeaders(origin) })
  if (req.method !== 'POST') return json({ ok: false, error: 'Método não permitido.' }, origin, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const publishableKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !publishableKey || !serviceRoleKey) {
    return json({ ok: false, error: 'Função não configurada.' }, origin, 500)
  }

  const authHeader = req.headers.get('Authorization') || ''
  const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!jwt) return json({ ok: false, error: 'Sessão ausente.' }, origin, 401)

  const contentType = req.headers.get('Content-Type') || ''
  if (!contentType.toLowerCase().startsWith('application/json')) {
    return json({ ok: false, error: 'Content-Type inválido.' }, origin, 415)
  }

  const body = await req.json().catch(() => ({}))
  if (body?.confirm !== 'DELETE_MY_ACCOUNT') {
    return json({ ok: false, error: 'Confirmação inválida.' }, origin, 400)
  }

  const userClient = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: authData, error: authError } = await userClient.auth.getUser(jwt)
  if (authError || !authData.user) return json({ ok: false, error: 'Sessão inválida ou expirada.' }, origin, 401)
  const userId = authData.user.id

  try {
    const bucket = 'financial-documents'
    const paths = await collectFiles(admin, bucket, userId)
    for (let index = 0; index < paths.length; index += 1000) {
      const batch = paths.slice(index, index + 1000)
      const { error: removeError } = await admin.storage.from(bucket).remove(batch)
      if (removeError) throw removeError
    }

    await admin.auth.admin.signOut(jwt, 'global').catch(() => undefined)

    const { error: deleteError } = await admin.auth.admin.deleteUser(userId, false)
    if (deleteError) throw deleteError

    return json({ ok: true }, origin)
  } catch (error) {
    console.error('delete-account failed', {
      userId,
      message: error instanceof Error ? error.message : 'unknown error',
    })
    return json({ ok: false, error: 'Não foi possível excluir a conta. Tente novamente.' }, origin, 500)
  }
})
