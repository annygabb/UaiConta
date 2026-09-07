import { getSupabaseClient } from '../../infrastructure/supabase/client'

export type EntityTable =
  | 'accounts'
  | 'credit_cards'
  | 'categories'
  | 'income_sources'
  | 'budgets'
  | 'goals'
  | 'recurrence_rules'

function withLegacyMoney(table: EntityTable, payload: Record<string, unknown>) {
  const next = { ...payload }
  const reais = (cents: unknown) => Number(cents || 0) / 100
  if (table === 'accounts' && 'initial_balance_cents' in next) next.initial_balance = reais(next.initial_balance_cents)
  if (table === 'credit_cards' && 'credit_limit_cents' in next) next.credit_limit = next.credit_limit_cents == null ? null : reais(next.credit_limit_cents)
  if (table === 'income_sources' && 'expected_amount_cents' in next) next.expected_amount = reais(next.expected_amount_cents)
  if (table === 'budgets' && 'amount_cents' in next) next.amount = reais(next.amount_cents)
  if (table === 'goals') {
    if ('target_amount_cents' in next) next.target_amount = reais(next.target_amount_cents)
    if ('current_amount_cents' in next) next.current_amount = reais(next.current_amount_cents)
  }
  return next
}

async function requireUserId() {
  const client = getSupabaseClient()
  const { data, error } = await client.auth.getUser()
  if (error || !data.user) throw error || new Error('Usuário não autenticado.')
  return data.user.id
}

export const entityRepository = {
  async list(table: EntityTable) {
    const client = getSupabaseClient()
    const { data, error } = await client.from(table).select('*').order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  },

  async create(table: EntityTable, payload: Record<string, unknown>) {
    const client = getSupabaseClient()
    const userId = await requireUserId()
    const body = withLegacyMoney(table, payload)
    const { data, error } = await client.from(table).insert({ ...body, user_id: userId }).select('*').single()
    if (error) throw error
    return data
  },

  async update(table: EntityTable, id: string, payload: Record<string, unknown>) {
    const client = getSupabaseClient()
    const safePayload = withLegacyMoney(table, payload)
    delete (safePayload as Record<string, unknown>).user_id
    const { data, error } = await client.from(table).update(safePayload).eq('id', id).select('*').single()
    if (error) throw error
    return data
  },

  async remove(table: EntityTable, id: string) {
    const client = getSupabaseClient()
    const { error } = await client.from(table).delete().eq('id', id)
    if (error) throw error
  },
}
