import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const indexCss = readFileSync(new URL('../../src/index.css', import.meta.url), 'utf8')
const mobileAuthCss = readFileSync(new URL('../../src/styles/v8-mobile-auth.css', import.meta.url), 'utf8')

describe('mobile auth layout guard', () => {
  it('loads the mobile auth override after the other UI layers', () => {
    expect(indexCss).toContain('@import "./styles/v8-mobile-auth.css";')
    expect(indexCss.indexOf('v8-mobile-auth.css')).toBeGreaterThan(indexCss.indexOf('v8-calendar-motion.css'))
  })

  it('keeps login/create-account reachable on narrow and touch layouts', () => {
    expect(mobileAuthCss).toContain('(max-width: 1100px), (hover: none) and (pointer: coarse)')
    expect(mobileAuthCss).toContain('.auth-page.auth-page-v6')
    expect(mobileAuthCss).toContain('flex-direction: column !important')
    expect(mobileAuthCss).toContain('overflow-y: auto !important')
    expect(mobileAuthCss).toContain('.auth-card.auth-card-v6')
    expect(mobileAuthCss).toContain('max-height: none !important')
  })

  it('avoids iOS focus zoom and preserves mobile safe areas', () => {
    expect(mobileAuthCss).toContain('font-size: 16px !important')
    expect(mobileAuthCss).toContain('env(safe-area-inset-top)')
    expect(mobileAuthCss).toContain('env(safe-area-inset-bottom)')
  })
})
