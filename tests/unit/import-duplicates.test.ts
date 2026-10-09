import { describe, expect, it } from 'vitest'
import {
  applyDuplicateDecision,
  findDuplicateCandidates,
} from '../../src/features/import/duplicateDetection'

const existing = {
  id: 'existing-1',
  date: '2026-08-15',
  amount: 125.9,
  amountCents: 12590,
  description: 'Supermercado Central',
  paymentMethod: 'Pix',
  sourceFile: 'agosto.pdf',
}

const imported = {
  id: 'draft-1',
  date: '2026-08-15',
  amount: 125.9,
  amountCents: 12590,
  description: 'SUPERMERCADO CENTRAL',
  paymentMethod: 'Pix',
  sourceFile: 'outro-banco.csv',
}

describe('detecção e decisão de duplicidades', () => {
  it('encontra o mesmo lançamento mesmo quando veio de outro arquivo', () => {
    const candidates = findDuplicateCandidates(imported, [existing], [])

    expect(candidates).toHaveLength(1)
    expect(candidates[0]).toMatchObject({
      candidateId: 'existing-1',
      scope: 'existing',
    })
    expect(candidates[0].reasons).toEqual(expect.arrayContaining(['date', 'amount', 'description']))
  })

  it('também sinaliza repetição dentro do mesmo lote', () => {
    const candidates = findDuplicateCandidates({ ...imported, id: 'draft-2' }, [], [imported])

    expect(candidates[0]).toMatchObject({ candidateId: 'draft-1', scope: 'batch' })
  })

  it.each([
    ['keep_both', 'ready', 'draft-1', null],
    ['ignore_new', 'ignored', 'draft-1', null],
    ['replace_existing', 'ready', 'existing-1', 'existing-1'],
    ['edit_new', 'editing', 'draft-1', null],
  ] as const)('aplica a decisão %s sem exclusão automática', (decision, status, expectedId, replaceExistingId) => {
    const result = applyDuplicateDecision({
      decision,
      draft: imported,
      candidate: existing,
    })

    expect(result).toMatchObject({ status, replaceExistingId })
    expect(result.draft.id).toBe(expectedId)
    expect(result.draft.__duplicateDecision).toBe(decision)
  })

  it('aplica correções somente ao novo lançamento', () => {
    const result = applyDuplicateDecision({
      decision: 'edit_new',
      draft: imported,
      candidate: existing,
      edits: { amount: 129.9, amountCents: 12990 },
    })

    expect(result.draft).toMatchObject({ id: 'draft-1', amount: 129.9, amountCents: 12990 })
    expect(existing.amountCents).toBe(12590)
  })
})
