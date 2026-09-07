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
