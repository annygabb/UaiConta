import { describe, expect, it } from 'vitest'
import { evaluatePassword } from '../../src/components/ui/PasswordStrength.jsx'

describe('força de senha', () => {
  it('exige comprimento, maiúsculas/minúsculas, número e símbolo', () => {
    const strong = evaluatePassword('UaiConta#2026Segura')
    expect(strong.score).toBe(strong.max)
    expect(strong.guessable).toBe(false)
    expect(strong.rules.every((rule) => rule.met)).toBe(true)
  })

  it('rebaixa padrões conhecidos mesmo quando têm caracteres', () => {
    const weak = evaluatePassword('Password123456!')
    expect(weak.guessable).toBe(true)
    expect(weak.score).toBe(1)
  })
})
