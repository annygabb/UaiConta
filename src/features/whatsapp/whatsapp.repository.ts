import { getSupabaseClient } from '../../infrastructure/supabase/client'

async function user() {
  const client = getSupabaseClient()
  const { data, error } = await client.auth.getUser()
  if (error || !data.user) throw error || new Error('Usuário não autenticado.')
  return data.user
}

export const whatsappRepository = {
  async getLink() {
    const client = getSupabaseClient()
    const { data, error } = await client.from('whatsapp_links').select('id,phone_last4,paired_at,active').eq('active', true).maybeSingle()
    if (error) throw error
    return data
  },
  async createPairingCode() {
    const client = getSupabaseClient()
    await user()
    const { data, error } = await client.rpc('create_whatsapp_pairing_code')
    if (error) throw error
    const result = Array.isArray(data) ? data[0] : data
    if (!result?.code) throw new Error('Não foi possível gerar o código de vinculação.')
    return { code: result.code, expiresAt: result.expires_at }
  },
  async disconnect() {
    const client = getSupabaseClient()
    const { error } = await client.rpc('disconnect_whatsapp')
    if (error) throw error
  },
}
