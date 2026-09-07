import { getSupabaseClient } from '../../infrastructure/supabase/client'
import type { RecurrenceRule } from './recurrence'

function fromRow(row: Record<string, any>): RecurrenceRule {
  return {
    id: row.id,
    type: row.type,
    amountCents: Number(row.amount_cents || 0),
    description: row.description,
    category: row.category || 'Não categorizado',
    paymentMethod: row.payment_method || undefined,
    frequency: row.frequency,
    startDate: row.start_date,
    endDate: row.end_date || undefined,
    nextOccurrenceDate: row.next_occurrence_date || undefined,
    active: Boolean(row.active),
  }
}

export const recurrenceRepository = {
  async list(): Promise<RecurrenceRule[]> {
    const client = getSupabaseClient()
    const { data, error } = await client.from('recurrence_rules').select('*').order('created_at', { ascending: false })
    if (error) throw error
    return (data || []).map(fromRow)
  },

  async createFromTransaction(tx: Record<string, any>) {
    const client = getSupabaseClient()
    const { data: authData, error: authError } = await client.auth.getUser()
    if (authError || !authData.user) throw authError || new Error('Usuário não autenticado.')
    const amountCents = Number(tx.amountCents ?? Math.round(Number(tx.amount || 0) * 100))
    const { data, error } = await client.from('recurrence_rules').insert({
      user_id: authData.user.id,
      type: tx.type,
      amount_cents: amountCents,
      description: tx.description,
      category: tx.category || 'Não categorizado',
      subcategory: tx.subcategory || null,
      payment_method: tx.paymentMethod || null,
      frequency: tx.frequency || 'mensal',
      start_date: tx.date,
      end_date: tx.recurrenceEndDate || null,
      next_occurrence_date: tx.date,
      active: true,
    }).select('*').single()
    if (error) throw error
    return fromRow(data)
  },
}
