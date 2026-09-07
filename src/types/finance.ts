export type TransactionType = 'despesa' | 'receita' | 'investimento' | 'transferencia'
export type TransactionStatus = 'planned' | 'completed' | 'cancelled'
export type Confidence = 'alta' | 'media' | 'baixa'

export interface Transaction {
  id: string
  type: TransactionType
  amount: number
  amountCents: number
  description: string
  rawDescription?: string
  category: string
  subcategory?: string
  paymentMethod?: string
  accountId?: string
  creditCardId?: string
  date: string
  status: TransactionStatus
  isRecurring: boolean
  recurrenceId?: string
  occurrenceDate?: string
  notes?: string
  source?: string
  sourceFile?: string
  confidence?: Confidence
  __imported?: boolean
  createdAt?: string
  updatedAt?: string
}

export interface FinancialPeriod {
  mode: 'month' | 'year' | 'custom'
  startDate: string
  endDate: string
  referenceDate: string
}

export interface FinancialMetrics {
  realizedIncomeCents: number
  realizedExpenseCents: number
  realizedInvestmentCents: number
  realizedSavingsCents: number
  forecastIncomeCents: number
  forecastExpenseCents: number
  forecastInvestmentCents: number
  projectedBalanceCents: number
}
