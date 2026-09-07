import type { Session } from '@supabase/supabase-js'
import { getCurrentSession, getSupabaseClient, isSupabaseConfigured } from '../../infrastructure/supabase/client'

export type AuthResult = Session | { pendingConfirmation: true; user: unknown }

function clockSkewError(error: unknown) {
  const message = String((error as { message?: string })?.message || '')
  return /JWT issued at future/i.test(message)
}

async function throwAuthError(error: unknown): Promise<never> {
  if (clockSkewError(error)) {
    await getSupabaseClient().auth.signOut({ scope: 'local' }).catch(() => undefined)
    throw new Error('O horário do dispositivo parece estar fora de sincronia. Ative data e hora automáticas, sincronize o relógio e entre novamente.')
  }
  throw error
}

export async function initializeAuth(): Promise<Session | null> {
  try {
    return await getCurrentSession()
  } catch (error) {
    return throwAuthError(error)
  }
}

export function onAuthChanged(callback: (session: Session | null) => void) {
  if (!isSupabaseConfigured) return () => undefined
  const { data } = getSupabaseClient().auth.onAuthStateChange((_event, session) => callback(session))
  return () => data.subscription.unsubscribe()
}

export async function signIn(email: string, password: string): Promise<Session> {
  const { data, error } = await getSupabaseClient().auth.signInWithPassword({ email, password })
  if (error) return throwAuthError(error)
  if (!data.session) throw new Error('A sessão não foi criada.')
  return data.session
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
  if (error) await getSupabaseClient().auth.signOut({ scope: 'local' }).catch(() => undefined)
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

  await client.auth.signOut({ scope: 'local' }).catch(() => undefined)
  return response
}
