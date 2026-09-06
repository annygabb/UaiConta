export type MoneyCents = number

export function reaisToCents(value: number | string): MoneyCents {
  const parsed = typeof value === 'string'
    ? Number(value.replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, ''))
    : Number(value)
  if (!Number.isFinite(parsed)) return 0
  return Math.round(parsed * 100)
}

export function centsToReais(cents: MoneyCents): number {
  return Math.round(Number(cents || 0)) / 100
}

export function formatCents(cents: MoneyCents, options: Intl.NumberFormatOptions = {}) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    ...options,
  }).format(centsToReais(cents))
}

export function splitInstallmentsCents(totalCents: MoneyCents, count: number): MoneyCents[] {
  const installments = Math.max(1, Math.trunc(count))
  const base = Math.floor(totalCents / installments)
  const remainder = totalCents - base * installments
  return Array.from({ length: installments }, (_, index) => base + (index < remainder ? 1 : 0))
}

export const splitInstallments = splitInstallmentsCents
