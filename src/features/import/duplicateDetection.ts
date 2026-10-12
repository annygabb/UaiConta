export type DuplicateDecision = 'keep_both' | 'ignore_new' | 'replace_existing' | 'edit_new'

export interface DuplicateRecord {
  id?: string
  date?: string
  amount?: number
  amountCents?: number
  description?: string
  merchant?: string
  paymentMethod?: string
  type?: string
  externalId?: string
  fileHash?: string
  sourceFile?: string
  [key: string]: unknown
}

export interface DuplicateCandidate {
  candidateId: string
  candidate: DuplicateRecord
  scope: 'existing' | 'batch'
  score: number
  reasons: string[]
}

function normalizedText(value: unknown): string {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function amountCents(record: DuplicateRecord): number {
  return Number(record.amountCents ?? Math.round(Number(record.amount || 0) * 100))
}

function descriptionSimilarity(left: DuplicateRecord, right: DuplicateRecord): number {
  const first = normalizedText(left.merchant || left.description)
  const second = normalizedText(right.merchant || right.description)
  if (!first || !second) return 0
  if (first === second) return 1
  const a = new Set(first.split(' '))
  const b = new Set(second.split(' '))
  const intersection = [...a].filter((token) => b.has(token)).length
  const union = new Set([...a, ...b]).size
  return union ? intersection / union : 0
}

function scoreCandidate(draft: DuplicateRecord, candidate: DuplicateRecord) {
  const reasons: string[] = []
  let score = 0

  if (draft.externalId && candidate.externalId && draft.externalId === candidate.externalId) {
    reasons.push('external_id')
    score = 1
  }
  if (draft.fileHash && candidate.fileHash && draft.fileHash === candidate.fileHash) {
    reasons.push('file_hash')
    score = Math.max(score, 1)
  }
  if (draft.date && draft.date === candidate.date) { reasons.push('date'); score += 0.25 }
  if (amountCents(draft) > 0 && amountCents(draft) === amountCents(candidate)) { reasons.push('amount'); score += 0.4 }
  const similarity = descriptionSimilarity(draft, candidate)
  if (similarity >= 0.6) { reasons.push('description'); score += 0.25 * similarity }
  if (draft.paymentMethod && draft.paymentMethod === candidate.paymentMethod) { reasons.push('payment_method'); score += 0.05 }
  if (draft.type && draft.type === candidate.type) { reasons.push('type'); score += 0.05 }

  return { score: Math.min(1, score), reasons }
}

export function findDuplicateCandidates(
  draft: DuplicateRecord,
  existing: DuplicateRecord[] = [],
  batch: DuplicateRecord[] = [],
): DuplicateCandidate[] {
  return [
    ...existing.map((candidate) => ({ candidate, scope: 'existing' as const })),
    ...batch.map((candidate) => ({ candidate, scope: 'batch' as const })),
  ]
    .filter(({ candidate }) => candidate.id !== draft.id)
    .map(({ candidate, scope }, index) => {
      const match = scoreCandidate(draft, candidate)
      return {
        candidateId: String(candidate.id || `${scope}-${index}`),
        candidate,
        scope,
        score: match.score,
        reasons: match.reasons,
      }
    })
    .filter((candidate) => candidate.candidateId && candidate.score >= 0.65)
    .sort((left, right) => right.score - left.score)
}

export function applyDuplicateDecision({
  decision,
  draft,
  candidate,
  edits = {},
}: {
  decision: DuplicateDecision
  draft: DuplicateRecord
  candidate?: DuplicateRecord | null
  edits?: Partial<DuplicateRecord>
}) {
  const editedDraft = { ...draft, ...edits, __duplicateDecision: decision }
  if (decision === 'ignore_new') {
    return { status: 'ignored' as const, draft: editedDraft, replaceExistingId: null }
  }
  if (decision === 'replace_existing') {
    if (!candidate?.id) throw new Error('Selecione a movimentação que será substituída.')
    return {
      status: 'ready' as const,
      draft: { ...editedDraft, id: candidate.id },
      replaceExistingId: String(candidate.id),
    }
  }
  if (decision === 'edit_new') {
    return { status: 'editing' as const, draft: editedDraft, replaceExistingId: null }
  }
  return { status: 'ready' as const, draft: editedDraft, replaceExistingId: null }
}
