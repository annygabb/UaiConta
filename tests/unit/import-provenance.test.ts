import { describe, expect, it } from 'vitest'
import {
  summarizeDraftConfidence,
  type FieldEvidence,
  type ImportDraft,
} from '../../src/features/import/provenance'

const evidence = <T>(
  value: T,
  confidence: FieldEvidence<T>['confidence'] = 'alta',
): FieldEvidence<T> => ({
  value,
  source: { kind: 'line_text' },
  confidence,
  evidence: String(value ?? 'sem valor'),
})

function draftWith(overrides: Partial<ImportDraft['fields']> = {}): ImportDraft {
  return {
    id: 'draft-1',
    source: { kind: 'pdf', fileName: 'extrato.pdf' },
    fields: {
      type: evidence('despesa'),
      amountCents: evidence(1290),
      description: evidence('Supermercado Central'),
      date: {
        ...evidence('2026-08-15'),
        rule: 'line_full_date',
        ambiguous: false,
      },
      category: evidence('Supermercado'),
      paymentMethod: evidence('Pix'),
      ...overrides,
    },
  }
}

describe('proveniência de rascunhos de importação', () => {
  it('mantém valor, origem, confiança e evidência em cada campo', () => {
    const draft = draftWith()

    for (const field of Object.values(draft.fields)) {
      expect(field).toEqual(expect.objectContaining({
        value: expect.anything(),
        source: expect.objectContaining({ kind: expect.any(String) }),
        confidence: expect.stringMatching(/^(alta|media|baixa)$/),
        evidence: expect.any(String),
      }))
    }
  })

  it('marca o rascunho para revisão quando a data é ambígua', () => {
    const draft = draftWith({
      date: {
        value: null,
        source: { kind: 'pending' },
        confidence: 'baixa',
        evidence: 'Linha sem data e sem contexto de mês',
        rule: 'pending',
        ambiguous: true,
      },
    })

    expect(summarizeDraftConfidence(draft)).toEqual({
      level: 'baixa',
      requiresReview: true,
      reviewFields: ['date'],
    })
  })

  it('usa a menor confiança entre os campos sem alterar Transaction', () => {
    const draft = draftWith({ category: evidence('Transporte', 'media') })

    expect(summarizeDraftConfidence(draft)).toEqual({
      level: 'media',
      requiresReview: false,
      reviewFields: [],
    })
  })
})
