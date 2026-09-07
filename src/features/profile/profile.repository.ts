import { getSupabaseClient, isSupabaseConfigured } from '../../infrastructure/supabase/client'

const DEMO_NAME_KEY = 'uaiconta-demo-display-name-v1'

async function requireUser() {
  const client = getSupabaseClient()
  const { data, error } = await client.auth.getUser()
  if (error || !data.user) throw error || new Error('Usuário não autenticado.')
  return data.user
}

export const profileRepository = {
  async getDisplayName() {
    if (!isSupabaseConfigured) {
      try { return localStorage.getItem(DEMO_NAME_KEY) || '' } catch { return '' }
    }
    const [client, user] = [getSupabaseClient(), await requireUser()]
    const { data, error } = await client.from('profiles').select('display_name').eq('id', user.id).maybeSingle()
    if (error) throw error
    return String(data?.display_name || user.user_metadata?.display_name || '').trim()
  },

  async saveDisplayName(displayName: string) {
    const clean = String(displayName || '').trim().replace(/\s+/g, ' ').slice(0, 60)
    if (!clean) throw new Error('Informe um nome válido.')

    if (!isSupabaseConfigured) {
      localStorage.setItem(DEMO_NAME_KEY, clean)
      return clean
    }

    const [client, user] = [getSupabaseClient(), await requireUser()]
    const { error } = await client.from('profiles').upsert({ id: user.id, display_name: clean }, { onConflict: 'id' })
    if (error) throw error
    return clean
  },
}
