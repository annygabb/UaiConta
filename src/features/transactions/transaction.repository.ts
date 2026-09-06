import type { Transaction } from '../../types/finance'
import { centsToReais, reaisToCents } from '../../domain/money/money'
import { getSupabaseClient } from '../../infrastructure/supabase/client'

function fromRow(row: Record<string, any>): Transaction {
  const cents = Number(row.amount_cents ?? reaisToCents(row.amount ?? 0))
  return {
    id: row.id,
    type: row.type,
    amountCents: cents,
    amount: centsToReais(cents),
    description: row.display_description || row.description || 'Movimentação',
    rawDescription: row.raw_description || undefined,
    category: row.category || 'Não categorizado',
    subcategory: row.subcategory || undefined,
    paymentMethod: row.payment_method || undefined,
    date: row.transaction_date,
    status: row.status || 'completed',
    isRecurring: Boolean(row.is_recurring),
    recurrenceId: row.recurrence_id || undefined,
    occurrenceDate: row.occurrence_date || undefined,
    notes: row.notes || undefined,
    source: row.source || 'manual',
    sourceFile: row.source_file || undefined,
    confidence: row.confidence || 'alta',
    __imported: Boolean(row.imported),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toRow(tx: Partial<Transaction>, userId: string) {
  const amountCents = Number(tx.amountCents ?? reaisToCents(tx.amount ?? 0))
  return {
    id: tx.id,
    user_id: userId,
    type: tx.type,
    amount_cents: amountCents,
    amount: centsToReais(amountCents),
    description: tx.description,
    display_description: tx.description,
    raw_description: tx.rawDescription || null,
    category: tx.category || 'Não categorizado',
    subcategory: tx.subcategory || null,
    payment_method: tx.paymentMethod || null,
    transaction_date: tx.date,
    status: tx.status || 'completed',
    is_recurring: Boolean(tx.isRecurring),
    recurrence_id: tx.recurrenceId || null,
    occurrence_date: tx.occurrenceDate || null,
    notes: tx.notes || null,
    source: tx.source || (tx.__imported ? 'pdf' : 'manual'),
    source_file: tx.sourceFile || null,
    confidence: tx.confidence || 'alta',
    imported: Boolean(tx.__imported),
    updated_at: new Date().toISOString(),
  }
}

async function requireUser() {
  const client = getSupabaseClient()
  const { data, error } = await client.auth.getUser()
  if (error || !data.user) throw error || new Error('Usuário não autenticado.')
  return data.user
}

export const transactionRepository = {
  async list() {
    const client = getSupabaseClient()
    const { data, error } = await client
      .from('transactions')
      .select('*')
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data || []).map(fromRow)
  },

  async upsert(tx: Partial<Transaction>) {
    const [client, user] = [getSupabaseClient(), await requireUser()]
    const { data, error } = await client
      .from('transactions')
      .upsert(toRow(tx, user.id), { onConflict: 'id' })
      .select('*')
      .single()
    if (error) throw error
    return fromRow(data)
  },

  async upsertMany(rows: Partial<Transaction>[]) {
    const [client, user] = [getSupabaseClient(), await requireUser()]
    const payload = rows.map((row) => toRow(row, user.id))
    const { data, error } = await client
      .from('transactions')
      .upsert(payload, { onConflict: 'id' })
      .select('*')
    if (error) throw error
    return (data || []).map(fromRow)
  },

  async remove(id: string) {
    const client = getSupabaseClient()
    const { error } = await client.from('transactions').delete().eq('id', id)
    if (error) throw error
  },
}
