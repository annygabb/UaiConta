import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve(process.cwd())
const migration = readFileSync(join(root, 'supabase/migrations/20260906150000_v4_foundation.sql'), 'utf8')
const edgeFunction = readFileSync(join(root, 'supabase/functions/delete-account/index.ts'), 'utf8')
const vercelConfig = readFileSync(join(root, 'vercel.json'), 'utf8')

function collectFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? collectFiles(path) : [path]
  })
}

describe('security baseline', () => {
  it('mantém RLS e ownership nas policies financeiras', () => {
    expect(migration).toMatch(/enable row level security/i)
    expect(migration).toMatch(/to authenticated using \(\(select auth\.uid\(\)\) = user_id\)/i)
    expect(migration).toMatch(/for update to authenticated using .* with check/is)
  })

  it('mantém o bucket financeiro privado e por pasta do usuário', () => {
    expect(migration).toMatch(/'financial-documents'[\s\S]*false/)
    expect(migration).toMatch(/storage\.foldername\(name\).*auth\.uid\(\)/is)
  })

  it('não expõe service role no código do navegador', () => {
    const browserFiles = collectFiles(join(root, 'src')).filter((path) => /\.(?:js|jsx|ts|tsx)$/.test(path))
    const leaked = browserFiles.filter((path) => readFileSync(path, 'utf8').includes('SUPABASE_SERVICE_ROLE_KEY'))
    expect(leaked).toEqual([])
  })

  it('protege a Edge Function destrutiva com origem, método, sessão e confirmação explícita', () => {
    expect(edgeFunction).not.toMatch(/Access-Control-Allow-Origin['"]?\s*:\s*['"]\*['"]/)
    expect(edgeFunction).toMatch(/isAllowedOrigin/)
    expect(edgeFunction).toMatch(/req\.method !== 'POST'/)
    expect(edgeFunction).toMatch(/auth\.getUser\(jwt\)/)
    expect(edgeFunction).toMatch(/DELETE_MY_ACCOUNT/)
    expect(edgeFunction).toMatch(/Cache-Control['"]?\s*:\s*['"]no-store['"]/)
  })

  it('mantém headers defensivos no frontend público', () => {
    expect(vercelConfig).toMatch(/Content-Security-Policy/)
    expect(vercelConfig).toMatch(/frame-ancestors 'none'/)
    expect(vercelConfig).toMatch(/X-Content-Type-Options/)
    expect(vercelConfig).toMatch(/Permissions-Policy/)
  })
})
