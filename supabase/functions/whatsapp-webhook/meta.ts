function hex(bytes: Uint8Array) {
  return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function verifyMetaSignature(rawBody: string, signature: string | null, appSecret: string) {
  if (!signature?.startsWith('sha256=') || !appSecret) return false
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(appSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const expected = hex(new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody))))
  const actual = signature.slice(7)
  if (actual.length !== expected.length) return false
  let mismatch = 0
  for (let index = 0; index < expected.length; index += 1) mismatch |= expected.charCodeAt(index) ^ actual.charCodeAt(index)
  return mismatch === 0
}

export interface MetaMessageEvent {
  externalId: string
  sender: string
  timestamp: string
  type: string
  text: string | null
  mediaId: string | null
  mimeType: string | null
  filename: string | null
}

export function normalizeMetaEvents(payload: any): MetaMessageEvent[] {
  const events: MetaMessageEvent[] = []
  for (const entry of payload?.entry || []) for (const change of entry?.changes || []) {
    const value = change?.value || {}
    for (const message of value.messages || []) {
      const media = message.image || message.document || message.audio || null
      events.push({
        externalId: String(message.id || ''), sender: String(message.from || ''),
        timestamp: new Date(Number(message.timestamp || 0) * 1000).toISOString(), type: String(message.type || 'unknown'),
        text: message.text?.body || message.button?.text || null, mediaId: media?.id || null,
        mimeType: media?.mime_type || null, filename: media?.filename || null,
      })
    }
  }
  return events.filter((event) => event.externalId && event.sender)
}
