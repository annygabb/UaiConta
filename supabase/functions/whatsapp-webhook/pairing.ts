export function normalizeWhatsappPhone(phone: string) {
  return String(phone || '').replace(/\D/g, '')
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function sha256(value: string) {
  return bytesToHex(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))))
}

export function hashWhatsappPhone(phone: string, pepper: string) {
  return sha256(`${pepper}:phone:${normalizeWhatsappPhone(phone)}`)
}
