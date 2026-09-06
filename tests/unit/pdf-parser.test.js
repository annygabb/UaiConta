import { describe, expect, it } from 'vitest'
import { displayDescriptionFromRaw, isInformationalChunk, markPossibleDuplicates, parseFinancialText } from '../../src/pdfParserFree.js'

describe('parser local de PDF', () => {
  it('ignora aviso legal/contratual de fatura', () => {
    const text = '10/09/2026 Pagar menos que o valor mínimo e deixar a fatura atrasar R$ 1.200,00 11/09/2026 SUPERMERCADO CENTRAL R$ 125,90'
    const rows = parseFinancialText(text, { referenceYear: 2026, sourceFile:'fatura.pdf' })
    expect(rows).toHaveLength(1)
    expect(rows[0].description).toMatch(/SUPERMERCADO CENTRAL/i)
    expect(rows[0].category).toBe('Supermercado')
  })

  it('mantém raw separado da descrição exibida', () => {
    const raw = '15/08/2026 ANNYY G G OLIVEIRA cartão 1234 R$ 125,90'
    const display = displayDescriptionFromRaw(raw)
    expect(display).not.toMatch(/15\/08/)
    expect(display).not.toMatch(/125,90/)
    expect(display).toMatch(/ANNYY G G OLIVEIRA/i)
  })

  it('classifica texto informativo conhecido', () => {
    expect(isInformationalChunk('Limite total do cartão de crédito R$ 8.000,00')).toBe(true)
  })

  it('sinaliza duplicado dentro do lote', () => {
    const row = { date:'2026-09-10', amount:20, description:'Padaria', paymentMethod:'Pix', sourceFile:'a.pdf' }
    const marked = markPossibleDuplicates([row, { ...row, id:'2' }], [])
    expect(marked[0].__possibleDuplicate).toBe(false)
    expect(marked[1].__possibleDuplicate).toBe(true)
  })
})
