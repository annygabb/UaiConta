import { getSupabaseClient } from '../../infrastructure/supabase/client'

export type ReceiptDocumentType = 'nota_fiscal' | 'cupom' | 'recibo' | 'comprovante' | 'outro'

export interface ReceiptDraft {
  merchantName?: string
  documentType: ReceiptDocumentType
  documentNumber?: string
  documentDate?: string
  totalAmountCents?: number
  linkedTransactionId?: string
  notes?: string
}

export interface ReceiptFileUpload {
  file: File
  pageOrder?: number
}

export interface StructuredReceiptDraft extends ReceiptDraft {
  importBatchId: string
  category?: string
  paymentMethod?: string
  items: Array<{ description: string; quantity: number; unitPriceCents: number | null; totalPriceCents: number; confidence: string }>
}

async function requireUser() {
  const client = getSupabaseClient()
  const { data, error } = await client.auth.getUser()
  if (error || !data.user) throw error || new Error('Usuário não autenticado.')
  return data.user
}

async function sha256(file: File) {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer())
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function sha256Text(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function safeFilename(name: string) {
  return name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-').slice(0, 120)
}

export const receiptRepository = {
  async list() {
    const client = getSupabaseClient()
    const { data, error } = await client
      .from('receipts')
      .select('*, receipt_files(*), receipt_items(*)')
      .order('document_date', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  },

  async create(draft: ReceiptDraft, files: ReceiptFileUpload[]) {
    const client = getSupabaseClient()
    const user = await requireUser()
    const { data: receipt, error } = await client
      .from('receipts')
      .insert({
        user_id: user.id,
        merchant_name: draft.merchantName || null,
        document_type: draft.documentType,
        document_number: draft.documentNumber || null,
        document_date: draft.documentDate || null,
        total_amount_cents: draft.totalAmountCents ?? null,
        linked_transaction_id: draft.linkedTransactionId || null,
        notes: draft.notes || null,
        processing_status: 'uploaded',
      })
      .select('*')
      .single()
    if (error) throw error

    const uploadedPaths: string[] = []
    try {
      for (let index = 0; index < files.length; index += 1) {
        const entry = files[index]
        const hash = await sha256(entry.file)
        const filename = safeFilename(entry.file.name || `documento-${index + 1}`)
        const storagePath = `${user.id}/receipts/${receipt.id}/original/${String(index + 1).padStart(3, '0')}-${filename}`

        const { error: uploadError } = await client.storage
          .from('financial-documents')
          .upload(storagePath, entry.file, { upsert: false, contentType: entry.file.type || undefined })
        if (uploadError) throw uploadError
        uploadedPaths.push(storagePath)

        const { error: fileError } = await client.from('receipt_files').insert({
          receipt_id: receipt.id,
          user_id: user.id,
          storage_path: storagePath,
          original_filename: entry.file.name,
          mime_type: entry.file.type || 'application/octet-stream',
          file_size: entry.file.size,
          page_order: entry.pageOrder ?? index,
          file_hash: hash,
        })
        if (fileError) throw fileError
      }
    } catch (uploadError) {
      if (uploadedPaths.length) {
        try { await client.storage.from('financial-documents').remove(uploadedPaths) } catch {}
      }
      try { await client.from('receipts').delete().eq('id', receipt.id) } catch {}
      throw uploadError
    }

    return receipt
  },

  async createStructured(draft: StructuredReceiptDraft, files: ReceiptFileUpload[]) {
    const client = getSupabaseClient()
    const user = await requireUser()
    const batchId = draft.importBatchId
    const uploaded: Array<Record<string, unknown>> = []
    try {
      const fileHashes = await Promise.all(files.map((entry) => sha256(entry.file)))
      const payloadHash = await sha256Text(JSON.stringify({
        merchantName: draft.merchantName || null, documentType: draft.documentType, documentDate: draft.documentDate || null,
        totalAmountCents: draft.totalAmountCents ?? null, category: draft.category || null, paymentMethod: draft.paymentMethod || null,
        notes: draft.notes || null, items: draft.items, files: files.map((entry, index) => ({ hash: fileHashes[index], name: entry.file.name, size: entry.file.size, type: entry.file.type })),
      }))
      const storagePaths = files.map((entry, index) => `${user.id}/receipts/pending/${batchId}/${String(index + 1).padStart(3, '0')}-${fileHashes[index]}-${safeFilename(entry.file.name)}`)
      const { error: prepareError } = await client.rpc('prepare_receipt_import', { p_batch_id: batchId, p_payload_hash: payloadHash })
      if (prepareError) throw prepareError
      for (let index = 0; index < files.length; index += 1) {
        const entry = files[index]
        const fileHash = fileHashes[index]
        const path = storagePaths[index]
        const { error } = await client.storage.from('financial-documents').upload(path, entry.file, { upsert: false, contentType: entry.file.type || undefined })
        if (error && !/duplicate|already exists/i.test(String(error.message || error))) throw error
        uploaded.push({ storage_path: path, original_filename: entry.file.name, mime_type: entry.file.type || 'application/octet-stream', file_size: entry.file.size, page_order: entry.pageOrder ?? index, file_hash: fileHash })
      }
      const { data, error } = await client.rpc('confirm_receipt_import', {
        p_receipt: { import_batch_id: batchId, import_payload_hash: payloadHash, merchant_name: draft.merchantName, document_type: draft.documentType, document_date: draft.documentDate, total_amount_cents: draft.totalAmountCents, category: draft.category, payment_method: draft.paymentMethod, notes: draft.notes },
        p_items: draft.items.map((item) => ({ description: item.description, quantity: item.quantity, unit_price_cents: item.unitPriceCents, total_price_cents: item.totalPriceCents, confidence: item.confidence })),
        p_files: uploaded,
      })
      if (error) throw error
      return data
    } catch (error) {
      // Não remova aqui: uma perda de rede pode acontecer depois do commit do
      // RPC. O mesmo batch id pode ser reenviado com segurança; órfãos nunca
      // confirmados são responsabilidade de uma rotina de retenção.
      throw error
    }
  },

  async getSignedUrl(storagePath: string, expiresIn = 60) {
    const client = getSupabaseClient()
    const { data, error } = await client.storage
      .from('financial-documents')
      .createSignedUrl(storagePath, expiresIn)
    if (error) throw error
    return data.signedUrl
  },

  async download(storagePath: string) {
    const client = getSupabaseClient()
    const { data, error } = await client.storage.from('financial-documents').download(storagePath)
    if (error) throw error
    return data
  },

  async removeReceipt(receiptId: string) {
    const client = getSupabaseClient()
    const { data: files, error } = await client
      .from('receipt_files')
      .select('storage_path')
      .eq('receipt_id', receiptId)
    if (error) throw error
    const paths = (files || []).map((item) => item.storage_path).filter(Boolean)
    if (paths.length) {
      const { error: storageError } = await client.storage.from('financial-documents').remove(paths)
      if (storageError) throw storageError
    }
    const { error: deleteError } = await client.from('receipts').delete().eq('id', receiptId)
    if (deleteError) throw deleteError
  },
}
