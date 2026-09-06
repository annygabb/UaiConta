import { uid } from "./utils.js";

const LOCAL_KEY = "uaiconta-transactions-v2";
const LEGACY_KEY = "pfos-transactions-v1";
const ONBOARDING_KEY = "uaiconta-onboarded-v2";
const SESSION_KEY = "uaiconta-supabase-session";

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export const dataMode = supabaseUrl && supabaseAnonKey ? "supabase" : "local";
export const isSupabaseConfigured = dataMode === "supabase";

function safeJson(value, fallback) {
  try { return JSON.parse(value); } catch { return fallback; }
}

function normalizeTx(item) {
  return {
    id: item.id || uid(),
    type: item.type || "despesa",
    amount: Number(item.amount || 0),
    description: String(item.description || "Movimentação"),
    category: item.category || "Gastos gerais",
    subcategory: item.subcategory || "",
    paymentMethod: item.paymentMethod || item.payment_method || "Pix",
    date: item.date || item.transaction_date || new Date().toISOString().slice(0, 10),
    isRecurring: Boolean(item.isRecurring ?? item.is_recurring),
    notes: item.notes || "",
    source: item.source || "manual",
    sourceFile: item.sourceFile || item.source_file || "",
    confidence: item.confidence || "alta",
    __imported: Boolean(item.__imported ?? item.imported),
    createdAt: item.createdAt || item.created_at || new Date().toISOString(),
    updatedAt: item.updatedAt || item.updated_at || new Date().toISOString(),
  };
}

export function getStoredSession() {
  if (!isSupabaseConfigured) return null;
  try { return safeJson(sessionStorage.getItem(SESSION_KEY), null); } catch { return null; }
}

function storeSession(session) {
  try {
    if (session) sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {}
}

async function authRequest(path, body) {
  const response = await fetch(`${supabaseUrl}/auth/v1/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: supabaseAnonKey },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.msg || data?.error_description || data?.message || "Falha na autenticação.");
  return data;
}

export async function signIn(email, password) {
  if (!isSupabaseConfigured) throw new Error("Supabase não configurado.");
  const data = await authRequest("token?grant_type=password", { email, password });
  const session = { access_token: data.access_token, refresh_token: data.refresh_token, user: data.user };
  storeSession(session);
  return session;
}

export async function signUp(email, password) {
  if (!isSupabaseConfigured) throw new Error("Supabase não configurado.");
  const data = await authRequest("signup", { email, password });
  if (data.access_token) {
    const session = { access_token: data.access_token, refresh_token: data.refresh_token, user: data.user };
    storeSession(session);
    return session;
  }
  return { user: data.user, pendingConfirmation: true };
}

export async function signOut() {
  const session = getStoredSession();
  if (session?.access_token) {
    await fetch(`${supabaseUrl}/auth/v1/logout`, {
      method: "POST",
      headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${session.access_token}` },
    }).catch(() => null);
  }
  storeSession(null);
}

function restHeaders(session, extra = {}) {
  return {
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${session.access_token}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

function toDb(tx, userId) {
  return {
    id: tx.id,
    user_id: userId,
    type: tx.type,
    amount: Number(tx.amount),
    description: tx.description,
    category: tx.category,
    subcategory: tx.subcategory || null,
    payment_method: tx.paymentMethod || null,
    transaction_date: tx.date,
    is_recurring: Boolean(tx.isRecurring),
    notes: tx.notes || null,
    source: tx.source || (tx.__imported ? "pdf" : "manual"),
    source_file: tx.sourceFile || null,
    confidence: tx.confidence || "alta",
    imported: Boolean(tx.__imported),
    updated_at: new Date().toISOString(),
  };
}

function fromDb(row) {
  return normalizeTx(row);
}

export async function loadTransactions(session = getStoredSession()) {
  if (!isSupabaseConfigured || !session?.access_token) return loadLocalTransactions();
  const response = await fetch(`${supabaseUrl}/rest/v1/transactions?select=*&order=transaction_date.desc,created_at.desc`, {
    headers: restHeaders(session),
  });
  if (!response.ok) throw new Error("Não foi possível carregar as movimentações do banco.");
  const rows = await response.json();
  return rows.map(fromDb);
}

export function loadLocalTransactions() {
  try {
    const current = safeJson(localStorage.getItem(LOCAL_KEY), null);
    if (Array.isArray(current)) return current.map(normalizeTx);
    const legacy = safeJson(localStorage.getItem(LEGACY_KEY), []);
    if (Array.isArray(legacy) && legacy.length) {
      const normalized = legacy.map((item) => {
        const type = item.category === "Investimentos" && item.type === "despesa" ? "investimento" : item.type;
        return normalizeTx({ ...item, type, category: type === "investimento" ? "Outros investimentos" : item.category });
      });
      localStorage.setItem(LOCAL_KEY, JSON.stringify(normalized));
      return normalized;
    }
  } catch {}
  return [];
}

function saveLocalTransactions(transactions) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(transactions.map(normalizeTx)));
}

export async function saveTransaction(tx, transactions, session = getStoredSession()) {
  const normalized = normalizeTx({ ...tx, updatedAt: new Date().toISOString() });
  if (!isSupabaseConfigured || !session?.access_token) {
    const next = transactions.some((item) => item.id === normalized.id)
      ? transactions.map((item) => item.id === normalized.id ? normalized : item)
      : [normalized, ...transactions];
    saveLocalTransactions(next);
    return next;
  }
  const userId = session.user?.id;
  const response = await fetch(`${supabaseUrl}/rest/v1/transactions?on_conflict=id`, {
    method: "POST",
    headers: restHeaders(session, { Prefer: "resolution=merge-duplicates,return=representation" }),
    body: JSON.stringify(toDb(normalized, userId)),
  });
  if (!response.ok) throw new Error("Não foi possível salvar a movimentação.");
  const [saved] = await response.json();
  const mapped = fromDb(saved);
  return transactions.some((item) => item.id === mapped.id)
    ? transactions.map((item) => item.id === mapped.id ? mapped : item)
    : [mapped, ...transactions];
}

export async function saveManyTransactions(rows, transactions, session = getStoredSession()) {
  const normalized = rows.map((row) => normalizeTx(row));
  if (!isSupabaseConfigured || !session?.access_token) {
    const map = new Map(transactions.map((item) => [item.id, item]));
    normalized.forEach((item) => map.set(item.id, item));
    const next = Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
    saveLocalTransactions(next);
    return next;
  }
  const userId = session.user?.id;
  const response = await fetch(`${supabaseUrl}/rest/v1/transactions?on_conflict=id`, {
    method: "POST",
    headers: restHeaders(session, { Prefer: "resolution=merge-duplicates,return=representation" }),
    body: JSON.stringify(normalized.map((item) => toDb(item, userId))),
  });
  if (!response.ok) throw new Error("Não foi possível importar as movimentações.");
  return loadTransactions(session);
}

export async function deleteTransaction(id, transactions, session = getStoredSession()) {
  if (!isSupabaseConfigured || !session?.access_token) {
    const next = transactions.filter((item) => item.id !== id);
    saveLocalTransactions(next);
    return next;
  }
  const response = await fetch(`${supabaseUrl}/rest/v1/transactions?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: restHeaders(session),
  });
  if (!response.ok) throw new Error("Não foi possível excluir a movimentação.");
  return transactions.filter((item) => item.id !== id);
}

export function getLocalMigrationRows() {
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return loadLocalTransactions().map((item) => ({
    ...item,
    id: uuidPattern.test(String(item.id || "")) ? item.id : uid(),
  }));
}

export function isMigrationDone(userId) {
  try { return localStorage.getItem(`uaiconta-local-migration-v2:${userId}`) === "true"; } catch { return false; }
}

export function markMigrationDone(userId) {
  try { localStorage.setItem(`uaiconta-local-migration-v2:${userId}`, "true"); } catch {}
}

export function isOnboarded(userId = "local") {
  try { return localStorage.getItem(`${ONBOARDING_KEY}:${userId}`) === "true"; } catch { return false; }
}

export function markOnboarded(userId = "local") {
  try { localStorage.setItem(`${ONBOARDING_KEY}:${userId}`, "true"); } catch {}
}

export function resetLocalData() {
  localStorage.removeItem(LOCAL_KEY);
  localStorage.removeItem(LEGACY_KEY);
  Object.keys(localStorage).filter((key) => key.startsWith(ONBOARDING_KEY)).forEach((key) => localStorage.removeItem(key));
}
