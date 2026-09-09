import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { getCurrentSession, getSupabaseClient, isSupabaseConfigured } from '../../infrastructure/supabase/client'

export type AuthResult = Session | { pendingConfirmation: true; user: unknown }

const AUTH_BOOT_TIMEOUT_MS = 3500
const REFRESH_MARGIN_MS = 90_000

function clockSkewError(error: unknown) {
  const message = String((error as { message?: string })?.message || '')
  return /JWT issued at future|issued in the future|not valid yet/i.test(message)
}

function clockSkewMessage() {
  return new Error('Não foi possível validar a hora da sessão agora. O UaiConta manteve o acesso local; confira se Data e Hora automáticas estão ativadas no iPhone.')
}

function passkeySetupError(error: unknown) {
  const message = String((error as { message?: string })?.message || '')
  return /passkey|webauthn|relying party|rp id|not enabled|disabled/i.test(message)
}

async function clearLocalSession() {
  await getSupabaseClient().auth.signOut({ scope: 'local' }).catch(() => undefined)
}

async function throwAuthError(error: unknown): Promise<never> {
  if (clockSkewError(error)) {
    await clearLocalSession()
    throw clockSkewMessage()
  }
  throw error
}

async function initializeAuthInternal(): Promise<Session | null> {
  const client = getSupabaseClient()
  try {
    const cached = await getCurrentSession()
    if (!cached) return null

    // A newly-created session is already valid. Refreshing it immediately is
    // unnecessary and was one of the points where Mobile Safari could bounce
    // the user back to login. Refresh only when it is actually close to expiry.
    const expiresAtMs = Number(cached.expires_at || 0) * 1000
    if (!expiresAtMs || expiresAtMs > Date.now() + REFRESH_MARGIN_MS) return cached

    const { data: refreshed, error: refreshError } = await client.auth.refreshSession({ refresh_token: cached.refresh_token })
    if (!refreshError && refreshed.session) return refreshed.session

    // A clock mismatch should never turn a valid local session into a forced
    // logout. Keep the cached session and let the next automatic refresh retry.
    if (refreshError && clockSkewError(refreshError)) return cached
    if (refreshError) throw refreshError
    return cached
  } catch (error) {
    if (clockSkewError(error)) return getCurrentSession().catch(() => null)
    throw error
  }
}

export async function initializeAuth(): Promise<Session | null> {
  // Mobile Safari can occasionally leave storage/network-backed auth restoration
  // pending for a long time. Never let bootstrap block login/signup forever.
  return Promise.race([
    initializeAuthInternal(),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), AUTH_BOOT_TIMEOUT_MS)),
  ])
}

export function onAuthChanged(callback: (session: Session | null, event: AuthChangeEvent) => void) {
  if (!isSupabaseConfigured) return () => undefined
  const { data } = getSupabaseClient().auth.onAuthStateChange((event, session) => callback(session, event))
  return () => data.subscription.unsubscribe()
}

export async function signIn(email: string, password: string): Promise<Session> {
  const client = getSupabaseClient()
  let result = await client.auth.signInWithPassword({ email, password })

  if (result.error && clockSkewError(result.error)) {
    await clearLocalSession()
    await new Promise((resolve) => setTimeout(resolve, 450))
    result = await client.auth.signInWithPassword({ email, password })
  }

  if (result.error) return throwAuthError(result.error)
  if (!result.data.session) throw new Error('A sessão não foi criada.')
  return result.data.session
}

export async function signInWithPasskey(): Promise<Session> {
  const client = getSupabaseClient()
  try {
    const { data, error } = await client.auth.signInWithPasskey()
    if (error) throw error
    if (!data?.session) throw new Error('A biometria foi validada, mas a sessão não foi criada.')
    return data.session
  } catch (error) {
    if (String((error as { name?: string })?.name || '') === 'NotAllowedError') {
      throw new Error('A autenticação biométrica foi cancelada ou não pôde ser concluída.')
    }
    if (passkeySetupError(error)) {
      throw new Error('A biometria ainda precisa ser ativada para o UaiConta no Supabase. Entre com sua senha e ative o acesso biométrico em Mais.')
    }
    throw error
  }
}

export async function registerPasskey() {
  const client = getSupabaseClient()
  try {
    const { data, error } = await client.auth.registerPasskey()
    if (error) throw error
    return data
  } catch (error) {
    if (String((error as { name?: string })?.name || '') === 'NotAllowedError') {
      throw new Error('O cadastro da biometria foi cancelado.')
    }
    if (passkeySetupError(error)) {
      throw new Error('A autenticação por biometria ainda precisa ser habilitada no projeto Supabase do UaiConta.')
    }
    throw error
  }
}

export async function signUp(email: string, password: string, displayName = ''): Promise<AuthResult> {
  const cleanName = String(displayName || '').trim().replace(/\s+/g, ' ').slice(0, 60)
  const { data, error } = await getSupabaseClient().auth.signUp({
    email,
    password,
    options: cleanName ? { data: { display_name: cleanName } } : undefined,
  })
  if (error) return throwAuthError(error)
  if (data.session) return data.session
  return { pendingConfirmation: true, user: data.user }
}

export async function requestPasswordReset(email: string) {
  const redirectTo = typeof window === 'undefined' ? undefined : `${window.location.origin}/redefinir-senha`
  const { error } = await getSupabaseClient().auth.resetPasswordForEmail(email, { redirectTo })
  if (error) return throwAuthError(error)
}

export async function updatePassword(password: string) {
  const { error } = await getSupabaseClient().auth.updateUser({ password })
  if (error) return throwAuthError(error)
}

export async function signOut() {
  if (!isSupabaseConfigured) return
  const { error } = await getSupabaseClient().auth.signOut({ scope: 'global' })
  if (error && !clockSkewError(error)) throw error
  if (error) await clearLocalSession()
}

export async function deleteOwnAccount() {
  const client = getSupabaseClient()
  const { data, error: sessionError } = await client.auth.getSession()
  if (sessionError) return throwAuthError(sessionError)
  if (!data.session) throw new Error('Sua sessão expirou. Entre novamente para excluir a conta.')

  const { data: response, error } = await client.functions.invoke('delete-account', {
    body: { confirm: 'DELETE_MY_ACCOUNT' },
  })
  if (error) return throwAuthError(error)
  if (!response?.ok) throw new Error(response?.error || 'Não foi possível excluir a conta.')

  await clearLocalSession()
  return response
}
