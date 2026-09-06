import type { Session } from '@supabase/supabase-js'
import { getCurrentSession, getSupabaseClient, isSupabaseConfigured } from '../../infrastructure/supabase/client'

export type AuthResult = Session | { pendingConfirmation: true; user: unknown }

export async function initializeAuth(): Promise<Session | null> {
  return getCurrentSession()
}

export function onAuthChanged(callback: (session: Session | null) => void) {
  if (!isSupabaseConfigured) return () => undefined
  const { data } = getSupabaseClient().auth.onAuthStateChange((_event, session) => callback(session))
  return () => data.subscription.unsubscribe()
}

export async function signIn(email: string, password: string): Promise<Session> {
  const { data, error } = await getSupabaseClient().auth.signInWithPassword({ email, password })
  if (error) throw error
  if (!data.session) throw new Error('A sessão não foi criada.')
  return data.session
}

export async function signUp(email: string, password: string): Promise<AuthResult> {
  const { data, error } = await getSupabaseClient().auth.signUp({ email, password })
  if (error) throw error
  if (data.session) return data.session
  return { pendingConfirmation: true, user: data.user }
}

export async function requestPasswordReset(email: string) {
  const redirectTo = typeof window === 'undefined' ? undefined : `${window.location.origin}/redefinir-senha`
  const { error } = await getSupabaseClient().auth.resetPasswordForEmail(email, { redirectTo })
  if (error) throw error
}

export async function updatePassword(password: string) {
  const { error } = await getSupabaseClient().auth.updateUser({ password })
  if (error) throw error
}

export async function signOut() {
  if (!isSupabaseConfigured) return
  const { error } = await getSupabaseClient().auth.signOut({ scope: 'global' })
  if (error) throw error
}

export async function deleteOwnAccount() {
  const client = getSupabaseClient()
  const { data, error: sessionError } = await client.auth.getSession()
  if (sessionError) throw sessionError
  if (!data.session) throw new Error('Sua sessão expirou. Entre novamente para excluir a conta.')

  const { data: response, error } = await client.functions.invoke('delete-account', {
    body: { confirm: 'DELETE_MY_ACCOUNT' },
  })
  if (error) throw error
  if (!response?.ok) throw new Error(response?.error || 'Não foi possível excluir a conta.')

  await client.auth.signOut({ scope: 'local' }).catch(() => undefined)
  return response
}
