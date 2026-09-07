import { describe, expect, it } from 'vitest'
import { suggestCategory, suggestPaymentMethod } from '../../src/features/import/importParser.js'

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
})
