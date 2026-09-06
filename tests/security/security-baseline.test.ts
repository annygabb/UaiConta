import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve(process.cwd())
const migration = readFileSync(join(root, 'supabase/migrations/20260906150000_v4_foundation.sql'), 'utf8')

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
})
