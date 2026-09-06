import { describe, expect, it } from 'vitest'
import { buildMonthlySeries, calculatePeriodMetrics, filterTransactions } from '../../src/finance.js'

const rows = [
  { id:'1', type:'receita', amount:5000, status:'completed', description:'Salário', category:'Salário', paymentMethod:'Pix', date:'2026-09-05' },
  { id:'2', type:'despesa', amount:1000, status:'completed', description:'Mercado', category:'Supermercado', paymentMethod:'Cartão de crédito', date:'2026-09-07' },
  { id:'3', type:'despesa', amount:500, status:'completed', description:'Faculdade', category:'Faculdade', paymentMethod:'Pix', date:'2026-09-08' },
  { id:'4', type:'investimento', amount:700, status:'completed', description:'Reserva', category:'Reserva de emergência', paymentMethod:'Pix', date:'2026-09-09' },
  { id:'5', type:'transferencia', amount:900, status:'completed', description:'Conta A → B', category:'Transferência entre contas', paymentMethod:'Transferência', date:'2026-09-10' },
  { id:'6', type:'receita', amount:4500, status:'completed', description:'Salário', category:'Salário', paymentMethod:'Pix', date:'2026-08-05' },
  { id:'7', type:'despesa', amount:2000, status:'completed', description:'Gastos agosto', category:'Não categorizado', paymentMethod:'Cartão de crédito', date:'2026-08-10' },
]

describe('domínio financeiro', () => {
  it('calcula receita, gasto, investimento e sobra sem contar transferências', () => {
    const metrics = calculatePeriodMetrics(rows, '2026-09')
    expect(metrics.income).toBe(5000)
    expect(metrics.expense).toBe(1500)
    expect(metrics.investments).toBe(700)
    expect(metrics.realizedBalance).toBe(2800)
    expect(Math.round(metrics.committedRate)).toBe(44)
  })

  it('separa realizado de previsto sem tratar previsão como paga', () => {
    const metrics = calculatePeriodMetrics([
      ...rows,
      { id:'planned:salary', type:'receita', amount:900, status:'planned', description:'Freelance', category:'Freelance', paymentMethod:'Pix', date:'2026-09-20' },
      { id:'planned:rent', type:'despesa', amount:300, status:'planned', description:'Conta prevista', category:'Não categorizado', paymentMethod:'Pix', date:'2026-09-25' },
    ], '2026-09')
    expect(metrics.realizedIncome).toBe(5000)
    expect(metrics.plannedIncome).toBe(900)
    expect(metrics.forecastIncome).toBe(5900)
    expect(metrics.realizedExpense).toBe(1500)
    expect(metrics.forecastExpense).toBe(1800)
    expect(metrics.realizedBalance).toBe(2800)
    expect(metrics.forecastBalance).toBe(3400)
  })

  it('ignora itens cancelados nas métricas', () => {
    const metrics = calculatePeriodMetrics([...rows, { id:'x', type:'despesa', amount:999, status:'cancelled', date:'2026-09-12', category:'Lazer' }], '2026-09')
    expect(metrics.expense).toBe(1500)
  })

  it('percentuais das categorias somam aproximadamente 100%', () => {
    const metrics = calculatePeriodMetrics(rows, '2026-09')
    const total = metrics.categoryData.reduce((sum, item) => sum + item.percentage, 0)
    expect(Math.abs(total - 100)).toBeLessThan(0.001)
  })

  it('Pix x cartão considera somente despesas', () => {
    const metrics = calculatePeriodMetrics(rows, '2026-09')
    expect(metrics.byPayment.Pix).toBe(500)
    expect(metrics.byPayment['Cartão de crédito']).toBe(1000)
  })

  it('série mensal separa pix e cartão', () => {
    const series = buildMonthlySeries(rows, '2026-09', 2)
    expect(series).toHaveLength(2)
    expect(series[1].pix).toBe(500)
    expect(series[1].cartao).toBe(1000)
  })

  it('filtros combinam período, tipo e busca', () => {
    const filtered = filterTransactions(rows, { period:'2026-09', type:'despesa', status:'todos', category:'todas', payment:'todas', imported:'todos', search:'mercado' })
    expect(filtered).toHaveLength(1)
    expect(filtered[0].id).toBe('2')
  })
})
