import { getSupabaseClient } from '../../infrastructure/supabase/client'

const tables = [
  'profiles','accounts','credit_cards','income_sources','categories','subcategories','transactions',
  'transaction_items','budgets','goals','recurrence_rules','installment_plans','installments','investments',
  'pdf_imports','pdf_import_items','receipts','receipt_files','receipt_items','user_preferences','migration_state',
] as const

export async function exportOwnData() {
  const client = getSupabaseClient()
  const payload: Record<string, unknown> = { exportedAt: new Date().toISOString(), version: 'uaiconta-v4' }
  for (const table of tables) {
    const { data, error } = await client.from(table).select('*')
    if (error) payload[table] = { error: error.message }
    else payload[table] = data || []
  }
  return payload
}

export function downloadJson(data: unknown, filename = 'uaiconta-backup.json') {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
