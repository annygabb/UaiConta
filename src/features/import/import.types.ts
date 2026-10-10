import type { Confidence, TransactionType } from '../../types/finance'

export type ImportConfidenceLevel = Confidence

export type ImportSourceKind =
  | 'pdf'
  | 'csv'
  | 'image'
  | 'whatsapp'
  | 'manual'
  | 'line_text'
  | 'month_heading'
  | 'document_date'
  | 'received_at'
  | 'upload_date'
  | 'ocr'
  | 'history'
  | 'system_suggestion'
  | 'pending'

export interface ImportSource {
  kind: ImportSourceKind
  fileName?: string
  fileHash?: string
  page?: number
  line?: number
  position?: number
}

export interface FieldEvidence<T> {
  value: T | null
  source: ImportSource
  confidence: ImportConfidenceLevel
  evidence: string
}

export type DateResolutionRule =
  | 'line_full_date'
  | 'month_heading'
  | 'document_date'
  | 'received_at'
  | 'pending'

export interface DateResolution extends FieldEvidence<string> {
  rule: DateResolutionRule
  ambiguous: boolean
}

export interface ImportDraftFields {
  type: FieldEvidence<TransactionType>
  amountCents: FieldEvidence<number>
  description: FieldEvidence<string>
  date: DateResolution
  category: FieldEvidence<string>
  paymentMethod: FieldEvidence<string>
}

export interface ImportDraft {
  id: string
  source: ImportSource
  fields: ImportDraftFields
  rawText?: string
  externalId?: string
}

export interface ImportConfidence {
  level: ImportConfidenceLevel
  requiresReview: boolean
  reviewFields: Array<keyof ImportDraftFields>
}
