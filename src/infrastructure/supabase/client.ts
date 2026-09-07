import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js'

const url = String(import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '')
const publishableKey = String(
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '',
)

export const isSupabaseConfigured = Boolean(url && publishableKey)
export const isDemoEnabled = import.meta.env.MODE === 'demo' || String(import.meta.env.VITE_ENABLE_DEMO_MODE || '').toLowerCase() === 'true'
export const dataMode = isSupabaseConfigured ? 'supabase' : isDemoEnabled ? 'demo' : 'unavailable'

let client: SupabaseClient | null = null

function getSessionStorage() {
  if (typeof window === 'undefined') return undefined
  return window.sessionStorage
}

export function getSupabaseClient(): SupabaseClient {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase não está configurado para este ambiente.')
  }

  if (!client) {
    client = createClient(url, publishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: getSessionStorage(),
        storageKey: 'uaiconta-auth-v4',
      },
      global: {
        headers: {
          'x-client-info': 'uaiconta-web-v4',
        },
      },
    })
  }

  return client
}

export async function getCurrentSession(): Promise<Session | null> {
  if (!isSupabaseConfigured) return null
  const { data, error } = await getSupabaseClient().auth.getSession()
  if (error) throw error
  return data.session
}

export async function getVerifiedUser() {
  if (!isSupabaseConfigured) return null
  const { data, error } = await getSupabaseClient().auth.getUser()
  if (error) return null
  return data.user
}
