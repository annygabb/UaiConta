import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { basename, join, relative, resolve } from 'node:path'

const root = resolve(process.cwd())
const ignoredDirs = new Set(['node_modules', 'dist', '.git', '.vercel', 'playwright-report', 'test-results', 'coverage'])
const allowedFiles = new Set(['.env.example'])

function collect(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    if (ignoredDirs.has(name)) return []
    const path = join(dir, name)
    const stat = statSync(path)
    if (stat.isDirectory()) return collect(path)
    return [path]
  })
}

const secretPatterns = [
  /sb_(?:secret|service_role)_[A-Za-z0-9_-]{12,}/i,
  /SUPABASE_SERVICE_ROLE_KEY\s*=\s*[^\s#]+/i,
  /gh[pousr]_[A-Za-z0-9]{20,}/,
  /sk-[A-Za-z0-9_-]{20,}/,
  /AIza[0-9A-Za-z_-]{20,}/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
]

describe('public repository secret hygiene', () => {
  it('does not contain committed secret values', () => {
    const hits: string[] = []
    for (const path of collect(root)) {
      if (allowedFiles.has(basename(path))) continue
      let content = ''
      try { content = readFileSync(path, 'utf8') } catch { continue }
      for (const pattern of secretPatterns) {
        if (pattern.test(content)) hits.push(`${relative(root, path)} -> ${pattern}`)
      }
    }
    expect(hits).toEqual([])
  })

  it('keeps production environment values outside tracked source', () => {
    const files = collect(root).map((path) => relative(root, path).replace(/\\/g, '/'))
    expect(files).not.toContain('.env')
    expect(files).not.toContain('.env.local')
    expect(files).not.toContain('.env.production')
    expect(files).not.toContain('.vercel/project.json')
  })
})
