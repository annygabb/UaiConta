import { describe, expect, it } from 'vitest'
import { projectRecurrence, recurrenceOccurrenceKey } from '../../src/features/recurrences/recurrence.ts'

const base = {
  id: 'rule-1', type: 'despesa', amountCents: 150000, description: 'Faculdade', category: 'Faculdade', paymentMethod: 'Pix',
  frequency: 'mensal', startDate: '2026-09-30', active: true,
}

describe('recorrências', () => {
  it('projeta meses futuros como planned e preserva fim de mês', () => {
    const rows = projectRecurrence(base, '2026-09-01', '2026-12-31')
    expect(rows.map((r)=>r.date)).toEqual(['2026-09-30','2026-10-30','2026-11-30','2026-12-30'])
    expect(rows.every((r)=>r.status === 'planned')).toBe(true)
  })

  it('respeita data final e gera chave idempotente', () => {
    const rows = projectRecurrence({ ...base, endDate:'2026-10-30' }, '2026-09-01', '2026-12-31')
    expect(rows).toHaveLength(2)
    expect(recurrenceOccurrenceKey('rule-1','2026-10-30')).toBe('rule-1:2026-10-30')
  })

  it('não projeta regra pausada', () => {
    expect(projectRecurrence({ ...base, active:false }, '2026-09-01', '2026-12-31')).toEqual([])
  })
})
