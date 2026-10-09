import { describe, expect, it } from 'vitest'
import {
  resolveTransactionDate,
  scanMonthAnchors,
} from '../../src/features/import/dateResolution'

describe('resolução determinística de datas importadas', () => {
  it('prioriza a data completa presente na própria linha', () => {
    const result = resolveTransactionDate({
      lineText: '15/08/2026 Supermercado 42,90',
      position: 10,
      referenceYear: 2026,
      documentDate: '2026-09-30',
      receivedAt: '2026-10-01T12:00:00-03:00',
    })

    expect(result).toMatchObject({
      value: '2026-08-15',
      rule: 'line_full_date',
      source: { kind: 'line_text' },
      confidence: 'alta',
      ambiguous: false,
    })
  })

  it('combina o dia da linha com o cabeçalho de mês vigente', () => {
    const text = 'Agosto\n15 Supermercado 42,90\nSetembro\n02 Farmácia 19,50'
    const anchors = scanMonthAnchors(text, 2026)
    const firstPosition = text.indexOf('15 Supermercado')
    const secondPosition = text.indexOf('02 Farmácia')

    expect(resolveTransactionDate({
      lineText: '15 Supermercado 42,90',
      position: firstPosition,
      monthAnchors: anchors,
      referenceYear: 2026,
    })).toMatchObject({ value: '2026-08-15', rule: 'month_heading' })

    expect(resolveTransactionDate({
      lineText: '02 Farmácia 19,50',
      position: secondPosition,
      monthAnchors: anchors,
      referenceYear: 2026,
    })).toMatchObject({ value: '2026-09-02', rule: 'month_heading' })
  })

  it('resolve dezembro e janeiro em anos diferentes sem deslocar linhas', () => {
    const text = 'Dezembro\n31 Mercado 80,00\nJaneiro\n02 Padaria 12,00'
    const anchors = scanMonthAnchors(text, 2026)

    expect(anchors.map(({ month, year }) => ({ month, year }))).toEqual([
      { month: 12, year: 2025 },
      { month: 1, year: 2026 },
    ])
  })

  it('propaga para os próximos cabeçalhos o ano explícito do documento', () => {
    const anchors = scanMonthAnchors('Agosto 2025\n15 Mercado\nSetembro\n02 Padaria', 2026)

    expect(anchors.map(({ month, year }) => ({ month, year }))).toEqual([
      { month: 8, year: 2025 },
      { month: 9, year: 2025 },
    ])
  })

  it('usa a data geral do documento quando a linha não tem contexto suficiente', () => {
    const result = resolveTransactionDate({
      lineText: 'Compra supermercado 42,90',
      position: 20,
      referenceYear: 2026,
      documentDate: '2026-09-30',
    })

    expect(result).toMatchObject({
      value: '2026-09-30',
      rule: 'document_date',
      source: { kind: 'document_date' },
      confidence: 'media',
      ambiguous: false,
    })
  })

  it('usa a data de recebimento como evidência explícita de baixa confiança', () => {
    const result = resolveTransactionDate({
      lineText: 'Compra supermercado 42,90',
      position: 20,
      referenceYear: 2026,
      receivedAt: '2026-10-01T23:15:00-03:00',
    })

    expect(result).toMatchObject({
      value: '2026-10-01',
      rule: 'received_at',
      source: { kind: 'received_at' },
      confidence: 'baixa',
      ambiguous: false,
    })
  })

  it('mantém pendente uma linha sem data nem contexto', () => {
    const result = resolveTransactionDate({
      lineText: 'Compra supermercado 42,90',
      position: 20,
      referenceYear: 2026,
    })

    expect(result).toEqual({
      value: null,
      rule: 'pending',
      source: { kind: 'pending', position: 20 },
      confidence: 'baixa',
      evidence: 'Nenhuma data confiável encontrada para a linha',
      ambiguous: true,
    })
  })

  it('não aplica um cabeçalho que aparece depois da linha', () => {
    const text = '15 Mercado 80,00\nAgosto\n16 Padaria 12,00'
    const anchors = scanMonthAnchors(text, 2026)

    expect(resolveTransactionDate({
      lineText: '15 Mercado 80,00',
      position: 0,
      monthAnchors: anchors,
      referenceYear: 2026,
    }).rule).toBe('pending')
  })
})
