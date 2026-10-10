import { describe, expect, it } from 'vitest'
import { normalizeMetaEvents, verifyMetaSignature } from '../../supabase/functions/whatsapp-webhook/meta'
import { hashWhatsappPhone } from '../../supabase/functions/whatsapp-webhook/pairing'

describe('segurança do webhook do WhatsApp', () => {
  it('valida assinatura HMAC e rejeita corpo alterado', async () => {
    const body = '{"ok":true}'
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode('secret'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
    const bytes = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body)))
    const signature = `sha256=${Array.from(bytes).map((byte) => byte.toString(16).padStart(2, '0')).join('')}`
    expect(await verifyMetaSignature(body, signature, 'secret')).toBe(true)
    expect(await verifyMetaSignature(`${body}x`, signature, 'secret')).toBe(false)
  })

  it('normaliza eventos e vincula por hashes, nunca pelo telefone aberto', async () => {
    const events = normalizeMetaEvents({ entry: [{ changes: [{ value: { messages: [{ id: 'wamid.1', from: '5562999999999', timestamp: '1791633600', type: 'text', text: { body: '1' } }] } }] }] })
    expect(events[0]).toMatchObject({ externalId: 'wamid.1', sender: '5562999999999', text: '1' })
    expect(await hashWhatsappPhone('+55 (62) 99999-9999', 'pepper')).toHaveLength(64)
  })
})
