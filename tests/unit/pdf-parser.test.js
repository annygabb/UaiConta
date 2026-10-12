import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { displayDescriptionFromRaw, ensurePdfRuntimeCompatibility, isInformationalChunk, markPossibleDuplicates, parseFinancialText, readPdfFileAsArrayBuffer, shouldUseMainThreadPdfWorker } from '../../src/pdfParserFree.js'

const fixture = (name) => readFileSync(
  fileURLToPath(new URL(`../fixtures/statements/${name}`, import.meta.url)),
  'utf8',
)

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

  it('usa arrayBuffer quando FileReader não está disponível', async () => {
    const expected = new Uint8Array([37, 80, 68, 70]).buffer
    const result = await readPdfFileAsArrayBuffer({ arrayBuffer: async () => expected })
    expect(new Uint8Array(result)).toEqual(new Uint8Array(expected))
  })

  it('adiciona transferToFixedLength para Safari sem suporte nativo', () => {
    const original = Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, 'transferToFixedLength')
    try {
      delete ArrayBuffer.prototype.transferToFixedLength
      ensurePdfRuntimeCompatibility()

      const source = new Uint8Array([10, 20, 30, 40]).buffer
      const resized = source.transferToFixedLength(3)

      expect(Array.from(new Uint8Array(resized))).toEqual([10, 20, 30])
      expect(resized.byteLength).toBe(3)
    } finally {
      if (original) Object.defineProperty(ArrayBuffer.prototype, 'transferToFixedLength', original)
      else delete ArrayBuffer.prototype.transferToFixedLength
    }
  })

  it('usa o modo sem worker isolado em navegadores Apple', () => {
    expect(shouldUseMainThreadPdfWorker('Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1')).toBe(true)
    expect(shouldUseMainThreadPdfWorker('Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 CriOS/153.0 Mobile/15E148 Safari/604.1')).toBe(true)
    expect(shouldUseMainThreadPdfWorker('Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/153.0 Mobile Safari/537.36')).toBe(false)
  })

  it('lê extrato por blocos de data e horário com sinal unicode', () => {
    const text = `
      07 de setembro 2026 Saldo ao final do dia: R$ 3.593,17
      Hora Tipo Origem / Destino Forma de pagamento Valor
      19:42 Pix recebido CLIENTE EXEMPLO +R$ 136,00
      19:18 Pix enviado MERCADO EXEMPLO Com saldo −R$ 35,45
      06 de setembro 2026 Saldo ao final do dia: R$ 3.693,72
      10:06 Pix enviado SERVICO EXEMPLO Com saldo −R$ 47,00
    `

    const rows = parseFinancialText(text, { referenceYear: 2026, sourceFile: 'extrato.pdf' })

    expect(rows).toHaveLength(3)
    expect(rows.map((row) => row.amount)).toEqual([136, 35.45, 47])
    expect(rows.map((row) => row.date)).toEqual(['2026-09-07', '2026-09-07', '2026-09-06'])
    expect(rows[0].type).toBe('receita')
    expect(rows[1].type).toBe('despesa')
  })

  it('separa movimentações pelos cabeçalhos de agosto e setembro', () => {
    const rows = parseFinancialText(fixture('multi-month.txt'), {
      referenceYear: 2026,
      sourceFile: 'multimeses.pdf',
    })

    expect(rows).toHaveLength(3)
    expect(rows.map((row) => row.date)).toEqual([
      '2026-08-15',
      '2026-08-20',
      '2026-09-02',
    ])
    expect(rows.map((row) => row.amount)).toEqual([125.9, 800, 45])
    expect(rows.every((row) => row.dateResolution.rule === 'month_heading')).toBe(true)
    expect(rows.every((row) => row.fieldEvidence.date.value === row.date)).toBe(true)
    expect(rows.every((row) => row.requiresReview === false)).toBe(true)
  })

  it('resolve a virada dezembro/janeiro usando o ano de referência final', () => {
    const rows = parseFinancialText(fixture('year-boundary.txt'), {
      referenceYear: 2026,
      sourceFile: 'virada.pdf',
    })

    expect(rows).toHaveLength(2)
    expect(rows.map((row) => row.date)).toEqual(['2025-12-31', '2026-01-02'])
  })
})
