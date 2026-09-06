import type { Transaction, TransactionType } from '../../types/finance'
import { centsToReais } from '../../domain/money/money'

export type RecurrenceFrequency = 'semanal' | 'quinzenal' | 'mensal' | 'anual'

export interface RecurrenceRule {
  id: string
  type: Exclude<TransactionType, 'transferencia'>
  amountCents: number
  description: string
  category: string
  paymentMethod?: string
  frequency: RecurrenceFrequency
  startDate: string
  endDate?: string
  nextOccurrenceDate?: string
  active: boolean
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

function addMonths(date: Date, months: number) {
  const day = date.getUTCDate()
  const next = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1))
  const lastDay = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate()
  next.setUTCDate(Math.min(day, lastDay))
  return next
}

function step(date: Date, frequency: RecurrenceFrequency) {
  if (frequency === 'semanal') return addDays(date, 7)
  if (frequency === 'quinzenal') return addDays(date, 14)
  if (frequency === 'anual') return addMonths(date, 12)
  return addMonths(date, 1)
}

const iso = (date: Date) => date.toISOString().slice(0, 10)

export function projectRecurrence(rule: RecurrenceRule, startDate: string, endDate: string): Transaction[] {
  if (!rule.active) return []
  const rangeStart = new Date(`${startDate}T00:00:00Z`)
  const rangeEnd = new Date(`${endDate}T23:59:59Z`)
  const ruleEnd = rule.endDate ? new Date(`${rule.endDate}T23:59:59Z`) : null
  let cursor = new Date(`${rule.startDate}T00:00:00Z`)
  const rows: Transaction[] = []
  let guard = 0

  while (cursor <= rangeEnd && guard < 1000) {
    guard += 1
    if (ruleEnd && cursor > ruleEnd) break
    if (cursor >= rangeStart) {
      const occurrenceDate = iso(cursor)
      rows.push({
        id: `planned:${rule.id}:${occurrenceDate}`,
        type: rule.type,
        amountCents: rule.amountCents,
        amount: centsToReais(rule.amountCents),
        description: rule.description,
        category: rule.category,
        paymentMethod: rule.paymentMethod,
        date: occurrenceDate,
        status: 'planned',
        isRecurring: true,
        recurrenceId: rule.id,
        occurrenceDate,
        source: 'recorrencia',
      })
    }
    cursor = step(cursor, rule.frequency)
  }

  return rows
}

export function recurrenceOccurrenceKey(recurrenceId: string, occurrenceDate: string) {
  return `${recurrenceId}:${occurrenceDate}`
}
