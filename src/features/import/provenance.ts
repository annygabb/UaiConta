import type {
  FieldEvidence,
  ImportConfidence,
  ImportDraft,
  ImportDraftFields,
} from './import.types'

export type {
  DateResolution,
  DateResolutionRule,
  FieldEvidence,
  ImportConfidence,
  ImportConfidenceLevel,
  ImportDraft,
  ImportDraftFields,
  ImportSource,
  ImportSourceKind,
} from './import.types'

const confidenceWeight = { baixa: 0, media: 1, alta: 2 } as const
const confidenceByWeight = ['baixa', 'media', 'alta'] as const

function fieldNeedsReview(field: FieldEvidence<unknown>): boolean {
  if (field.value === null || field.confidence === 'baixa') return true
  return 'ambiguous' in field && field.ambiguous === true
}

export function summarizeDraftConfidence(draft: ImportDraft): ImportConfidence {
  const entries = Object.entries(draft.fields) as Array<[
    keyof ImportDraftFields,
    FieldEvidence<unknown>,
  ]>
  const reviewFields = entries
    .filter(([, field]) => fieldNeedsReview(field))
    .map(([name]) => name)
  const minimumWeight = entries.reduce<number>(
    (minimum, [, field]) => Math.min(minimum, confidenceWeight[field.confidence]),
    confidenceWeight.alta,
  )

  return {
    level: confidenceByWeight[minimumWeight],
    requiresReview: reviewFields.length > 0,
    reviewFields,
  }
}
