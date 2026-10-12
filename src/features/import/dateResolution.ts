import type { DateResolution } from './import.types'

const MONTHS = {
  janeiro: 1,
  fevereiro: 2,
  marco: 3,
  abril: 4,
  maio: 5,
  junho: 6,
  julho: 7,
  agosto: 8,
  setembro: 9,
  outubro: 10,
  novembro: 11,
  dezembro: 12,
} as const

const MONTH_PATTERN = Object.keys(MONTHS).join('|')

export interface MonthAnchor {
  index: number
  text: string
  month: number
  year: number
}

export interface DateResolutionInput {
  lineText: string
  position?: number
  monthAnchors?: MonthAnchor[]
  referenceYear: number
  documentDate?: string | null
  receivedAt?: string | null
  receivedSourceKind?: 'received_at' | 'upload_date'
}

function withoutAccents(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function validIsoDate(year: number, month: number, day: number): string | null {
  const date = new Date(Date.UTC(year, month - 1, day))
  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day
  ) return null
  return `${year}-${pad(month)}-${pad(day)}`
}

function parseExplicitDate(text: string, referenceYear: number): { value: string; evidence: string } | null {
  const iso = text.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})(?=\D|$)/)
  if (iso) {
    const value = validIsoDate(Number(iso[1]), Number(iso[2]), Number(iso[3]))
    if (value) return { value, evidence: iso[0] }
  }

  const slash = text.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/)
  if (slash) {
    let year = Number(slash[3])
    if (year < 100) year += 2000
    const value = validIsoDate(year, Number(slash[2]), Number(slash[1]))
    if (value) return { value, evidence: slash[0] }
  }

  const normalized = withoutAccents(text)
  const named = normalized.match(new RegExp(`\\b(\\d{1,2})\\s+(?:de\\s+)?(${MONTH_PATTERN})(?:\\s+(?:de\\s+)?(\\d{4}))\\b`, 'i'))
  if (named) {
    const month = MONTHS[named[2].toLowerCase() as keyof typeof MONTHS]
    const value = validIsoDate(Number(named[3] || referenceYear), month, Number(named[1]))
    if (value) return { value, evidence: named[0] }
  }

  return null
}

export function scanMonthAnchors(text: string, referenceYear: number): MonthAnchor[] {
  const normalized = withoutAccents(text)
  const pattern = new RegExp(`\\b(${MONTH_PATTERN})\\b(?:\\s+(?:de\\s+)?(\\d{4}))?`, 'gi')
  const anchors: Array<Omit<MonthAnchor, 'year'> & { explicitYear: number | null }> = []
  let match: RegExpExecArray | null

  while ((match = pattern.exec(normalized)) !== null) {
    anchors.push({
      index: match.index,
      text: text.slice(match.index, match.index + match[0].length),
      month: MONTHS[match[1].toLowerCase() as keyof typeof MONTHS],
      explicitYear: match[2] ? Number(match[2]) : null,
    })
  }

  const resolved = new Array<MonthAnchor>(anchors.length)
  const explicitIndexes = anchors
    .map((anchor, index) => anchor.explicitYear ? index : -1)
    .filter((index) => index >= 0)

  if (explicitIndexes.length) {
    for (const explicitIndex of explicitIndexes) {
      const anchor = anchors[explicitIndex]
      resolved[explicitIndex] = {
        index: anchor.index,
        text: anchor.text,
        month: anchor.month,
        year: anchor.explicitYear as number,
      }
    }

    const firstExplicit = explicitIndexes[0]
    for (let index = firstExplicit - 1; index >= 0; index -= 1) {
      const anchor = anchors[index]
      const following = resolved[index + 1]
      resolved[index] = {
        index: anchor.index,
        text: anchor.text,
        month: anchor.month,
        year: following.year - (anchor.month > following.month ? 1 : 0),
      }
    }

    for (let index = firstExplicit + 1; index < anchors.length; index += 1) {
      if (resolved[index]) continue
      const anchor = anchors[index]
      const previous = resolved[index - 1]
      resolved[index] = {
        index: anchor.index,
        text: anchor.text,
        month: anchor.month,
        year: previous.year + (anchor.month < previous.month ? 1 : 0),
      }
    }
    return resolved
  }

  let nextYear = referenceYear
  for (let index = anchors.length - 1; index >= 0; index -= 1) {
    const anchor = anchors[index]
    const following = resolved[index + 1]
    const year = anchor.explicitYear
      ?? (following && anchor.month > following.month ? following.year - 1 : nextYear)
    resolved[index] = {
      index: anchor.index,
      text: anchor.text,
      month: anchor.month,
      year,
    }
    nextYear = year
  }
  return resolved
}

export function resolveTransactionDate(input: DateResolutionInput): DateResolution {
  const position = input.position ?? 0
  const explicit = parseExplicitDate(input.lineText, input.referenceYear)
  if (explicit) {
    return {
      value: explicit.value,
      rule: 'line_full_date',
      source: { kind: 'line_text', position },
      confidence: 'alta',
      evidence: explicit.evidence,
      ambiguous: false,
    }
  }

  const dayMatch = input.lineText.match(/^\s*(\d{1,2})(?=\s|$)/)
  const activeAnchor = [...(input.monthAnchors ?? [])]
    .reverse()
    .find((anchor) => anchor.index <= position)
  if (dayMatch && activeAnchor) {
    const value = validIsoDate(activeAnchor.year, activeAnchor.month, Number(dayMatch[1]))
    if (value) {
      return {
        value,
        rule: 'month_heading',
        source: { kind: 'month_heading', position: activeAnchor.index },
        confidence: 'alta',
        evidence: `${dayMatch[1]} + ${activeAnchor.text}`,
        ambiguous: false,
      }
    }
  }

  if (input.documentDate) {
    const documentDate = parseExplicitDate(input.documentDate, input.referenceYear)
    if (documentDate) {
      return {
        value: documentDate.value,
        rule: 'document_date',
        source: { kind: 'document_date' },
        confidence: 'media',
        evidence: documentDate.evidence,
        ambiguous: false,
      }
    }
  }

  if (input.receivedAt) {
    const receivedDate = parseExplicitDate(input.receivedAt, input.referenceYear)
    if (receivedDate) {
      return {
        value: receivedDate.value,
        rule: 'received_at',
        source: { kind: input.receivedSourceKind ?? 'received_at' },
        confidence: 'baixa',
        evidence: input.receivedAt,
        ambiguous: false,
      }
    }
  }

  return {
    value: null,
    rule: 'pending',
    source: { kind: 'pending', position },
    confidence: 'baixa',
    evidence: 'Nenhuma data confiável encontrada para a linha',
    ambiguous: true,
  }
}
