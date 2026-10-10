type ImportCandidate = Record<string, unknown> & {
  id?: string
  type?: string
  amount?: number
  amountCents?: number
  description?: string
  date?: string
  requiresReview?: boolean
  __selected?: boolean
  __reviewConfirmed?: boolean
  __ignored?: boolean
}

function isValidDate(value: unknown): boolean {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return false
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
  return date.getUTCFullYear() === Number(match[1])
    && date.getUTCMonth() === Number(match[2]) - 1
    && date.getUTCDate() === Number(match[3])
}

export function isImportRowReady(row: ImportCandidate): boolean {
  const amountCents = Number(row.amountCents ?? Math.round(Number(row.amount || 0) * 100))
  return Boolean(
    !row.__ignored
    && row.type
    && String(row.description || '').trim().length >= 2
    && amountCents > 0
    && isValidDate(row.date)
    && (!row.requiresReview || row.__reviewConfirmed),
  )
}

function assertImportRowReady(row: ImportCandidate): void {
  const amountCents = Number(row.amountCents ?? Math.round(Number(row.amount || 0) * 100))
  if (!isValidDate(row.date)) throw new Error('Informe uma data válida antes de importar.')
  if (!String(row.description || '').trim()) throw new Error('Informe uma descrição antes de importar.')
  if (amountCents <= 0) throw new Error('Informe um valor maior que zero antes de importar.')
  if (row.requiresReview && !row.__reviewConfirmed) throw new Error('Confirme a revisão dos campos de baixa confiança antes de importar.')
  if (!row.type) throw new Error('Informe o tipo da movimentação antes de importar.')
}

export function prepareConfirmedRows(rows: ImportCandidate[]) {
  return rows
    .filter((row) => row.__selected && !row.__ignored)
    .map((row) => {
      assertImportRowReady(row)
      const amountCents = Number(row.amountCents ?? Math.round(Number(row.amount || 0) * 100))
      return {
        id: row.id,
        type: row.type,
        amount: amountCents / 100,
        amountCents,
        description: String(row.description || '').trim(),
        rawDescription: row.rawDescription,
        category: row.category,
        subcategory: row.subcategory,
        paymentMethod: row.paymentMethod,
        accountId: row.accountId,
        creditCardId: row.creditCardId,
        date: row.date,
        status: row.status || 'completed',
        isRecurring: Boolean(row.isRecurring),
        recurrenceId: row.recurrenceId,
        occurrenceDate: row.occurrenceDate,
        notes: row.notes,
        source: row.source,
        sourceFile: row.sourceFile,
        confidence: row.confidence,
        imported: true,
      }
    })
}
