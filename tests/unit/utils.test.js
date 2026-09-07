import { describe, expect, it } from 'vitest'
import { addMonthsToKey, currencyInput, parseCurrencyInput, periodLabel } from '../../src/utils.js'
import { centsToReais, reaisToCents, splitInstallmentsCents } from '../../src/domain/money/money.ts'

describe('dinheiro e datas', () => {
  it('máscara monetária trabalha em centavos', () => {
    expect(parseCurrencyInput('1.234,56')).toBe(1234.56)
    expect(currencyInput(1234.56)).toBe('1.234,56')
    expect(reaisToCents('1234,56')).toBe(123456)
    expect(centsToReais(123456)).toBe(1234.56)
  })

  it('divide parcelas sem perder centavos', () => {
    const parts = splitInstallmentsCents(10001, 3)
    expect(parts).toEqual([3334, 3334, 3333])
    expect(parts.reduce((a,b)=>a+b,0)).toBe(10001)
  })

  it('troca mês preservando virada do ano', () => {
    expect(addMonthsToKey('2026-12', 1)).toBe('2027-01')
    expect(addMonthsToKey('2026-01', -1)).toBe('2025-12')
  })

  it('label do período contém mês e ano', () => {
    const label = periodLabel('2026-09').toLowerCase()
    expect(label).toMatch(/setembro/)
    expect(label).toMatch(/2026/)
  })
})
