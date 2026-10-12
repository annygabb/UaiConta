import { describe, expect, it } from 'vitest'
import { extractTransactionsFromFile, suggestCategory, suggestPaymentMethod } from '../../src/features/import/importParser.js'

function csvFile(name, text, lastModified = Date.parse('2026-10-01T12:00:00Z')) {
  return {
    name,
    type: 'text/csv',
    lastModified,
    text: async () => text,
  }
}

describe('sugestões da importação', () => {
  it('sugere categorias conhecidas sem inventar quando não há evidência', () => {
    expect(suggestCategory('UBER *TRIP SAO PAULO', 'despesa')).toBe('Transporte')
    expect(suggestCategory('SUPERMERCADO CENTRAL', 'despesa')).toBe('Supermercado')
    expect(suggestCategory('Sessão psicóloga', 'despesa')).toBe('Psicóloga')
    expect(suggestCategory('Texto desconhecido XYZ', 'despesa')).toBe('Não categorizado')
  })

  it('sugere categorias de receita quando há contexto', () => {
    expect(suggestCategory('SALARIO EMPRESA', 'receita')).toBe('Salário')
    expect(suggestCategory('reembolso consulta', 'receita')).toBe('Reembolso')
  })

  it('reconhece forma de pagamento ou mantém não identificado', () => {
    expect(suggestPaymentMethod('Compra PIX enviada')).toBe('Pix')
    expect(suggestPaymentMethod('Compra no cartão de crédito')).toBe('Cartão de crédito')
    expect(suggestPaymentMethod('sem informação de pagamento')).toBe('Não identificado')
  })

  it('mantém a data pendente para revisão quando o CSV não informa data', async () => {
    const [row] = await extractTransactionsFromFile(csvFile(
      'sem-data.csv',
      'descricao;valor;forma_pagamento\nSupermercado Central;-42,90;Pix',
    ))

    expect(row.date).toBe('2026-10-01')
    expect(row.dateResolution).toMatchObject({
      rule: 'received_at',
      source: { kind: 'upload_date' },
      confidence: 'baixa',
    })
    expect(row.requiresReview).toBe(true)
  })

  it('preserva a data explícita do CSV com evidência de alta confiança', async () => {
    const [row] = await extractTransactionsFromFile(csvFile(
      'com-data.csv',
      'data;descricao;valor;categoria;forma_pagamento\n15/08/2026;Supermercado Central;-42,90;Supermercado;Pix',
    ))

    expect(row.date).toBe('2026-08-15')
    expect(row.dateResolution).toMatchObject({
      rule: 'line_full_date',
      source: { kind: 'line_text' },
      confidence: 'alta',
    })
    expect(row.fieldEvidence.amountCents.value).toBe(4290)
  })
})
