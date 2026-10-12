import { describe, expect, it } from 'vitest'
import {
  isImportRowReady,
  prepareConfirmedRows,
} from '../../src/features/import/importConfirmation'

const validRow = {
  id: 'draft-1',
  type: 'despesa',
  amount: 42.9,
  amountCents: 4290,
  description: 'Supermercado Central',
  category: 'Supermercado',
  paymentMethod: 'Pix',
  date: '2026-08-15',
  status: 'completed',
  isRecurring: false,
  source: 'csv',
  sourceFile: 'extrato.csv',
  confidence: 'alta',
  __imported: true,
  __selected: true,
}

describe('confirmação segura de rascunhos', () => {
  it('rejeita linha selecionada sem data obrigatória', () => {
    const row = { ...validRow, date: '', requiresReview: true, __reviewConfirmed: true }

    expect(isImportRowReady(row)).toBe(false)
    expect(() => prepareConfirmedRows([row])).toThrow(/data válida/i)
  })

  it('exige confirmação explícita para baixa confiança', () => {
    const row = { ...validRow, confidence: 'baixa', requiresReview: true }

    expect(isImportRowReady(row)).toBe(false)
    expect(() => prepareConfirmedRows([row])).toThrow(/revisão/i)
  })

  it('remove metadados de revisão depois da confirmação', () => {
    const [prepared] = prepareConfirmedRows([{
      ...validRow,
      confidence: 'baixa',
      requiresReview: true,
      __reviewConfirmed: true,
      __duplicateCandidates: [{ candidateId: 'old-1' }],
      __duplicateDecision: 'keep_both',
      fieldEvidence: { date: { value: '2026-08-15' } },
      dateResolution: { value: '2026-08-15' },
    }])

    expect(prepared).toMatchObject({
      id: 'draft-1',
      amount: 42.9,
      amountCents: 4290,
      date: '2026-08-15',
    })
    expect(Object.keys(prepared).some((key) => key.startsWith('__'))).toBe(false)
    expect(prepared).not.toHaveProperty('fieldEvidence')
    expect(prepared).not.toHaveProperty('dateResolution')
    expect(prepared).not.toHaveProperty('requiresReview')
  })

  it('mantém o id existente quando a decisão é substituir', () => {
    const [prepared] = prepareConfirmedRows([{
      ...validRow,
      id: 'existing-1',
      __duplicateDecision: 'replace_existing',
    }])

    expect(prepared.id).toBe('existing-1')
  })
})
