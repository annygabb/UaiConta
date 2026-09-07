import { uid } from './utils.js'
import {
  dataMode,
  isDemoEnabled,
  isSupabaseConfigured,
} from './infrastructure/supabase/client.ts'
import {
  deleteOwnAccount,
  initializeAuth,
  onAuthChanged,
  requestPasswordReset,
  signIn,
  signOut,
  signUp,
  updatePassword,
} from './features/auth/auth.repository.ts'
import { transactionRepository } from './features/transactions/transaction.repository.ts'

const LOCAL_KEY = 'uaiconta-transactions-v2'
const LEGACY_KEY = 'pfos-transactions-v1'
const ONBOARDING_KEY = 'uaiconta-onboarded-v2'

function safeJson(value, fallback) {
  try { return JSON.parse(value) } catch { return fallback }
}

function normalizeTx(item) {
  const amount = Number(item.amount ?? (Number(item.amountCents || 0) / 100))
  return {
    id: item.id || uid(),
    type: item.type || 'despesa',
    amount,
    amountCents: Number(item.amountCents ?? Math.round(amount * 100)),
    description: String(item.description || item.display_description || 'Movimentação'),
    rawDescription: item.rawDescription || item.raw_description || '',
    category: item.category || 'Não categorizado',
    subcategory: item.subcategory || '',
    paymentMethod: item.paymentMethod || item.payment_method || 'Pix',
    accountId: item.accountId || item.account_id || '',
    creditCardId: item.creditCardId || item.credit_card_id || '',
    date: item.date || item.transaction_date || new Date().toISOString().slice(0, 10),
    status: item.status || 'completed',
    isRecurring: Boolean(item.isRecurring ?? item.is_recurring),
    recurrenceId: item.recurrenceId || item.recurrence_id || '',
    occurrenceDate: item.occurrenceDate || item.occurrence_date || '',
    notes: item.notes || '',
    source: item.source || 'manual',
    sourceFile: item.sourceFile || item.source_file || '',
    confidence: item.confidence || 'alta',
    __imported: Boolean(item.__imported ?? item.imported),
    createdAt: item.createdAt || item.created_at || new Date().toISOString(),
    updatedAt: item.updatedAt || item.updated_at || new Date().toISOString(),
  }
}

export {
  dataMode,
  isDemoEnabled,
  isSupabaseConfigured,
  initializeAuth,
  onAuthChanged,
  requestPasswordReset,
  signIn,
  signOut,
  signUp,
  updatePassword,
  deleteOwnAccount,
}

export async function loadTransactions() {
  if (isSupabaseConfigured) return transactionRepository.list()
  if (isDemoEnabled) return loadLocalTransactions()
  throw new Error('O UaiConta não está conectado ao banco. Configure o Supabase ou ative explicitamente o modo demo em desenvolvimento.')
}

export function loadLocalTransactions() {
  if (!isDemoEnabled && isSupabaseConfigured) return []
  try {
    const current = safeJson(localStorage.getItem(LOCAL_KEY), null)
    if (Array.isArray(current)) return current.map(normalizeTx)
    const legacy = safeJson(localStorage.getItem(LEGACY_KEY), [])
    if (Array.isArray(legacy) && legacy.length) {
      const normalized = legacy.map((item) => {
        const type = item.category === 'Investimentos' && item.type === 'despesa' ? 'investimento' : item.type
        return normalizeTx({
          ...item,
          type,
          category: type === 'investimento' ? 'Outros investimentos' : (item.category || 'Não categorizado'),
        })
      })
      localStorage.setItem(LOCAL_KEY, JSON.stringify(normalized))
      return normalized
    }
  } catch {}
  return []
}

function saveLocalTransactions(transactions) {
  if (!isDemoEnabled) throw new Error('Persistência local só está disponível no modo demo explícito.')
  localStorage.setItem(LOCAL_KEY, JSON.stringify(transactions.map(normalizeTx)))
}

export async function saveTransaction(tx, transactions) {
  const normalized = normalizeTx({ ...tx, updatedAt: new Date().toISOString() })
  if (isSupabaseConfigured) {
    const saved = await transactionRepository.upsert(normalized)
    return transactions.some((item) => item.id === saved.id)
      ? transactions.map((item) => item.id === saved.id ? saved : item)
      : [saved, ...transactions]
  }
  if (isDemoEnabled) {
    const next = transactions.some((item) => item.id === normalized.id)
      ? transactions.map((item) => item.id === normalized.id ? normalized : item)
      : [normalized, ...transactions]
    saveLocalTransactions(next)
    return next
  }
  throw new Error('Backend indisponível. A movimentação não foi salva.')
}

export async function saveManyTransactions(rows, transactions) {
  const normalized = rows.map((row) => normalizeTx(row))
  if (isSupabaseConfigured) {
    await transactionRepository.upsertMany(normalized)
    return transactionRepository.list()
  }
  if (isDemoEnabled) {
    const map = new Map(transactions.map((item) => [item.id, item]))
    normalized.forEach((item) => map.set(item.id, item))
    const next = Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date))
    saveLocalTransactions(next)
    return next
  }
  throw new Error('Backend indisponível. Os dados não foram importados.')
}

export async function deleteTransaction(id, transactions) {
  if (isSupabaseConfigured) {
    await transactionRepository.remove(id)
    return transactions.filter((item) => item.id !== id)
  }
  if (isDemoEnabled) {
    const next = transactions.filter((item) => item.id !== id)
    saveLocalTransactions(next)
    return next
  }
  throw new Error('Backend indisponível. A movimentação não foi excluída.')
}

export function getLocalMigrationRows() {
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  try {
    const current = safeJson(localStorage.getItem(LOCAL_KEY), null)
    const legacy = safeJson(localStorage.getItem(LEGACY_KEY), [])
    const rows = Array.isArray(current) ? current : Array.isArray(legacy) ? legacy : []
    const normalized = rows.map((item) => normalizeTx({
      ...item,
      id: uuidPattern.test(String(item.id || '')) ? item.id : uid(),
    }))
    if (normalized.length) localStorage.setItem(LOCAL_KEY, JSON.stringify(normalized))
    return normalized
  } catch {
    return []
  }
}

export function isMigrationDone(userId) {
  try { return localStorage.getItem(`uaiconta-local-migration-v2:${userId}`) === 'true' } catch { return false }
}

export function markMigrationDone(userId) {
  try { localStorage.setItem(`uaiconta-local-migration-v2:${userId}`, 'true') } catch {}
}

export function isOnboarded(userId = 'demo') {
  try { return localStorage.getItem(`${ONBOARDING_KEY}:${userId}`) === 'true' } catch { return false }
}

export function markOnboarded(userId = 'demo') {
  try { localStorage.setItem(`${ONBOARDING_KEY}:${userId}`, 'true') } catch {}
}

export function resetLocalData() {
  if (!isDemoEnabled) throw new Error('A limpeza local só é permitida no modo demo.')
  localStorage.removeItem(LOCAL_KEY)
  localStorage.removeItem(LEGACY_KEY)
  Object.keys(localStorage).filter((key) => key.startsWith(ONBOARDING_KEY)).forEach((key) => localStorage.removeItem(key))
}
