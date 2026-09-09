import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js'

const url = String(import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '')
const publishableKey = String(
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '',
)

export const isSupabaseConfigured = Boolean(url && publishableKey)
export const isDemoEnabled = import.meta.env.MODE === 'demo' || String(import.meta.env.VITE_ENABLE_DEMO_MODE || '').toLowerCase() === 'true'
export const dataMode = isSupabaseConfigured ? 'supabase' : isDemoEnabled ? 'demo' : 'unavailable'

let client: SupabaseClient | null = null

function getAuthStorage() {
  if (typeof window === 'undefined') return undefined

  // iOS/Safari and standalone PWAs can recreate a sessionStorage context while
  // transitioning between screens. Prefer persistent localStorage so a freshly
  // authenticated session is not lost between the login and dashboard boot.
  try {
    const probe = '__uaiconta_auth_storage_probe__'
    window.localStorage.setItem(probe, '1')
    window.localStorage.removeItem(probe)
    return window.localStorage
  } catch {
    return window.sessionStorage
  }
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
        storage: getAuthStorage(),
        storageKey: 'uaiconta-auth-v5',
        experimental: {
          passkey: true,
        },
      },
      global: {
        headers: {
          'x-client-info': 'uaiconta-web-v5',
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
