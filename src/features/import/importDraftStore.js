const DB_NAME = 'uaiconta-import-drafts-v1'
const STORE_NAME = 'drafts'
const ACTIVE_ID = 'active-import'

function openDb() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) { resolve(null); return }
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: 'id' })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function withStore(mode, action) {
  const db = await openDb()
  if (!db) return undefined
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode)
    const store = transaction.objectStore(STORE_NAME)
    const request = action(store)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
    transaction.oncomplete = () => db.close()
  })
}

function serializeFileItem(item) {
  const file = item.file || item
  return {
    id: item.id,
    name: item.name || file?.name,
    type: file?.type || item.type || '',
    size: file?.size || item.size || 0,
    lastModified: file?.lastModified || item.lastModified || Date.now(),
    blob: file instanceof Blob ? file : item.blob,
    status: item.status === 'processando' ? 'pendente' : item.status,
    count: item.count || 0,
    error: item.error || '',
  }
}

function restoreFileItem(item) {
  const file = item.blob instanceof Blob
    ? new File([item.blob], item.name || 'arquivo', { type: item.type || item.blob.type || '', lastModified: item.lastModified || Date.now() })
    : null
  return { ...item, file, blob: undefined, status: item.status === 'processando' ? 'pendente' : item.status }
}

export async function saveImportDraft({ files = [], rows = [] }) {
  try {
    const safeRows = rows.map((row) => ({ ...row }))
    await withStore('readwrite', (store) => store.put({ id: ACTIVE_ID, updatedAt: Date.now(), files: files.map(serializeFileItem), rows: safeRows }))
  } catch {}
}

export async function loadImportDraft() {
  try {
    const record = await withStore('readonly', (store) => store.get(ACTIVE_ID))
    if (!record) return { files: [], rows: [] }
    return { files: (record.files || []).map(restoreFileItem).filter((item) => item.file), rows: record.rows || [] }
  } catch { return { files: [], rows: [] } }
}

export async function clearImportDraft() {
  try { await withStore('readwrite', (store) => store.delete(ACTIVE_ID)) } catch {}
}
