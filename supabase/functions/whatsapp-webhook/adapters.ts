export interface ExtractedMedia {
  bytes: Uint8Array
  mimeType: string
  filename: string
}

export async function downloadMetaMedia(mediaId: string, accessToken: string, graphVersion: string): Promise<ExtractedMedia> {
  const metadataResponse = await fetch(`https://graph.facebook.com/${graphVersion}/${encodeURIComponent(mediaId)}`, { headers: { Authorization: `Bearer ${accessToken}` } })
  if (!metadataResponse.ok) throw new Error('Não foi possível consultar a mídia recebida.')
  const metadata = await metadataResponse.json()
  const contentResponse = await fetch(metadata.url, { headers: { Authorization: `Bearer ${accessToken}` } })
  if (!contentResponse.ok) throw new Error('Não foi possível baixar a mídia recebida.')
  const announcedSize = Number(contentResponse.headers.get('content-length') || 0)
  if (announcedSize > 25 * 1024 * 1024) throw new Error('O arquivo ultrapassa o limite de 25 MB.')
  const buffer = await contentResponse.arrayBuffer()
  if (buffer.byteLength > 25 * 1024 * 1024) throw new Error('O arquivo ultrapassa o limite de 25 MB.')
  return {
    bytes: new Uint8Array(buffer),
    mimeType: metadata.mime_type || contentResponse.headers.get('content-type') || 'application/octet-stream',
    filename: metadata.filename || `${mediaId}.bin`,
  }
}

async function callTextAdapter(endpoint: string | undefined, media: ExtractedMedia, token?: string) {
  if (!endpoint) return null
  const response = await fetch(endpoint, {
    method: 'POST', headers: { 'content-type': media.mimeType, 'x-file-name': media.filename, ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: media.bytes,
  })
  if (!response.ok) throw new Error('O adaptador de leitura recusou o arquivo.')
  const data = await response.json()
  return typeof data.text === 'string' ? data.text.trim() : null
}

export function extractDocumentText(media: ExtractedMedia) {
  return callTextAdapter(Deno.env.get('DOCUMENT_TEXT_ENDPOINT'), media, Deno.env.get('MEDIA_ADAPTER_TOKEN'))
}

export function transcribeAudio(media: ExtractedMedia) {
  return callTextAdapter(Deno.env.get('AUDIO_TRANSCRIPTION_ENDPOINT'), media, Deno.env.get('MEDIA_ADAPTER_TOKEN'))
}
