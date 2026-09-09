import React, { useEffect, useMemo, useRef, useState } from 'react'
import { IconAlertTriangle, IconCheck, IconLoader2, IconTrash, IconX } from '@tabler/icons-react'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, PAYMENT_METHODS } from '../constants.js'
import { markPossibleDuplicates } from '../pdfParserFree.js'
import { extractTransactionsFromFile } from '../features/import/importParser.js'
import { clearImportDraft, loadImportDraft, saveImportDraft } from '../features/import/importDraftStore.js'
import { dateLabel, money } from '../utils.js'
import { Badge } from './Common.jsx'
import FileUploadPanel from './ui/FileUploadPanel.jsx'
import PurpleCheckbox from './ui/PurpleCheckbox.jsx'
import PurpleDatePicker from './ui/PurpleDatePicker.jsx'
import SelectField from './ui/SelectField.jsx'

const ACCEPT = '.pdf,.csv,.png,.jpg,.jpeg,.webp,application/pdf,text/csv,application/csv,image/png,image/jpeg,image/webp'

function isSupported(file) {
  const name = file?.name?.toLowerCase() || ''
  return file?.type === 'application/pdf' || file?.type === 'text/csv' || file?.type === 'application/csv' || file?.type?.startsWith('image/') || /\.(pdf|csv|png|jpe?g|webp)$/i.test(name)
}

function toEditableAmount(value) {
  const number = Number(value || 0)
  return number ? number.toFixed(2).replace('.', ',') : ''
}

function fromEditableAmount(value) {
  const normalized = String(value || '').trim().replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '')
  const number = Number(normalized)
  return Number.isFinite(number) ? Math.abs(number) : 0
}

function deferTask(callback) {
  if (typeof queueMicrotask === 'function') queueMicrotask(callback)
  else Promise.resolve().then(callback)
}

function fileId(file) {
  const random = typeof globalThis.crypto?.randomUUID === 'function' ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random()}`
  return `${file.name}-${file.size}-${file.lastModified}-${random}`
}

function defaultExpenseCategory() {
  return EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1] || EXPENSE_CATEGORIES[0] || 'Não categorizado'
}

function friendlyFileError(error, fileName = 'Arquivo') {
  const raw = String(error?.message || '')
  if (/undefined is not a function/i.test(raw)) return `${fileName}: o leitor do Safari encontrou uma incompatibilidade. A versão atual do UaiConta já inclui o modo compatível; toque em Tentar novamente.`
  return raw || `${fileName}: falha ao ler arquivo.`
}

export default function PdfImportModal({ existingTransactions, onClose, onImport }) {
  const queueRef = useRef([])
  const workerRef = useRef(false)
  const processedRef = useRef([])
  const hydratedRef = useRef(false)
  const persistTimerRef = useRef(null)
  const [files, setFiles] = useState([])
  const [rows, setRows] = useState([])
  const [processing, setProcessing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [message, setMessage] = useState('')
  const [restored, setRestored] = useState(false)

  const selectedRows = useMemo(() => rows.filter((row) => row.__selected && !row.__possibleDuplicate && Number(row.amount || 0) > 0), [rows])

  useEffect(() => {
    let active = true
    loadImportDraft().then((draft) => {
      if (!active) return
      if (draft.files.length || draft.rows.length) {
        setFiles(draft.files)
        setRows(draft.rows)
        processedRef.current = draft.rows
        setRestored(true)
        const pending = draft.files.filter((item) => ['pendente', 'erro'].includes(item.status))
        if (pending.length) {
          queueRef.current.push(...pending.map((item) => ({ ...item, status: 'pendente' })))
          deferTask(() => drainQueue())
        }
      }
      hydratedRef.current = true
    })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!hydratedRef.current) return undefined
    clearTimeout(persistTimerRef.current)
    persistTimerRef.current = setTimeout(() => saveImportDraft({ files, rows }), 180)
    return () => clearTimeout(persistTimerRef.current)
  }, [files, rows])

  async function addFiles(list) {
    const incoming = Array.from(list || []).filter(isSupported)
    if (!incoming.length) {
      setMessage('Use PDF, CSV, PNG, JPG, JPEG ou WEBP.')
      return
    }
    const additions = incoming.map((file) => ({ id: fileId(file), file, name: file.name, status: 'pendente', count: 0, error: '' }))
    setFiles((current) => [...current, ...additions])
    setMessage('')
    queueRef.current.push(...additions)
    await saveImportDraft({ files: [...files, ...additions], rows })
    await drainQueue()
  }

  async function drainQueue() {
    if (workerRef.current) return
    workerRef.current = true
    setProcessing(true)
    try {
      while (queueRef.current.length) {
        const item = queueRef.current.shift()
        setFiles((current) => current.map((entry) => entry.id === item.id ? { ...entry, status: 'processando', error: '' } : entry))
        try {
          const parsed = await extractTransactionsFromFile(item.file)
          const marked = markPossibleDuplicates(parsed, [...existingTransactions, ...processedRef.current]).map((row) => ({ ...row, __selected: !row.__possibleDuplicate && Number(row.amount || 0) > 0, __amountInput: toEditableAmount(row.amount) }))
          processedRef.current = [...processedRef.current.filter((row) => row.sourceFile !== item.name), ...marked]
          setRows((current) => [...current.filter((row) => row.sourceFile !== item.name), ...marked])
          setFiles((current) => current.map((entry) => entry.id === item.id ? { ...entry, status: 'processado', count: parsed.length, error: '' } : entry))
        } catch (error) {
          setFiles((current) => current.map((entry) => entry.id === item.id ? { ...entry, status: 'erro', error: friendlyFileError(error, item.name) } : entry))
        }
      }
    } finally {
      workerRef.current = false
      setProcessing(false)
    }
  }

  function updateRow(id, patch) { setRows((current) => current.map((row) => row.id === id ? { ...row, ...patch } : row)) }

  function removeFile(id) {
    const file = files.find((entry) => entry.id === id)
    queueRef.current = queueRef.current.filter((entry) => entry.id !== id)
    setFiles((current) => current.filter((entry) => entry.id !== id))
    if (file) {
      setRows((current) => current.filter((row) => row.sourceFile !== file.name))
      processedRef.current = processedRef.current.filter((row) => row.sourceFile !== file.name)
    }
  }

  async function retryFile(id) {
    const file = files.find((entry) => entry.id === id)
    if (!file) return
    setRows((current) => current.filter((row) => row.sourceFile !== file.name))
    processedRef.current = processedRef.current.filter((row) => row.sourceFile !== file.name)
    queueRef.current.push({ ...file, status: 'pendente' })
    await drainQueue()
  }

  async function importSelected() {
    if (!selectedRows.length || importing) return
    setImporting(true)
    try {
      await onImport(selectedRows.map(({ __selected, __possibleDuplicate, __amountInput, categorySuggested: _categorySuggested, ...row }) => ({ ...row, amount: Number(row.amount || 0) })))
      await clearImportDraft()
      onClose()
    } finally { setImporting(false) }
  }

  async function discardDraft() {
    if ((files.length || rows.length) && !window.confirm('Descartar todos os arquivos e revisões desta importação?')) return
    await clearImportDraft()
    setFiles([])
    setRows([])
    processedRef.current = []
    queueRef.current = []
    setRestored(false)
  }

  return (
    <div className="modal-backdrop">
      <div className="pdf-sheet import-sheet-v5" role="dialog" aria-modal="true" aria-labelledby="pdf-title">
        <header className="sheet-header">
          <div><span className="eyebrow">Importação local</span><h2 id="pdf-title">Importar arquivos</h2><p>PDF, imagem e CSV são processados no navegador. O UaiConta sugere categoria e forma de pagamento, mas você confirma antes de salvar.</p></div>
          <button className="icon-btn" onClick={onClose} aria-label="Fechar"><IconX size={20} /></button>
        </header>

        {restored && <div className="import-draft-notice"><IconCheck size={16} /><span>Seu rascunho anterior foi restaurado. Sair desta tela não apaga os arquivos.</span><button type="button" onClick={discardDraft}>Descartar rascunho</button></div>}

        <FileUploadPanel items={files} onFilesAdded={addFiles} onFileRemove={removeFile} onRetry={retryFile} maxFiles={10} maxSizeMB={50} accept={ACCEPT} helper="Arraste PDF, imagem ou CSV. Imagens usam OCR local; CSV tenta reconhecer colunas e categorias." />
        {message && <div className="inline-alert"><IconAlertTriangle size={17} /> {message}</div>}

        {rows.length > 0 && (
          <section className="pdf-review">
            <div className="section-line review-heading">
              <div><strong>Revise antes de importar</strong><small>{rows.length} itens encontrados · {selectedRows.length} prontos para importar</small></div>
              <div className="review-bulk"><button onClick={() => setRows((current) => current.map((row) => ({ ...row, __selected: !row.__possibleDuplicate && Number(row.amount || 0) > 0 })))}>Selecionar seguros</button><button onClick={() => setRows((current) => current.map((row) => ({ ...row, __selected: false })))}>Limpar</button></div>
            </div>
            <div className="review-list">
              {rows.map((row) => {
                const categories = row.type === 'receita' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
                return (
                  <article className={row.__possibleDuplicate ? 'review-row duplicate' : 'review-row'} key={row.id}>
                    <PurpleCheckbox checked={Boolean(row.__selected)} onCheckedChange={(checked) => updateRow(row.id, { __selected: checked })} ariaLabel={`Selecionar ${row.description}`} />
                    <div className="review-main">
                      <input className="review-description" value={row.description} onChange={(event) => updateRow(row.id, { description: event.target.value })} aria-label="Descrição importada" />
                      <div className="review-meta"><span>{dateLabel(row.date)}</span><span>{row.sourceFile}</span><Badge tone={row.confidence === 'alta' ? 'success' : row.confidence === 'media' ? 'warning' : 'danger'}>confiança {row.confidence}</Badge>{row.categorySuggested && <Badge tone="warning">categoria sugerida</Badge>}{row.__possibleDuplicate && <Badge tone="danger">possível duplicado</Badge>}</div>
                      <div className="review-fields import-review-grid-v5">
                        <label className="review-amount-field"><span>Valor</span><input inputMode="decimal" value={row.__amountInput ?? toEditableAmount(row.amount)} onChange={(event) => updateRow(row.id, { __amountInput: event.target.value, amount: fromEditableAmount(event.target.value) })} /></label>
                        <SelectField value={row.type} onChange={(value) => updateRow(row.id, { type: value, category: value === 'receita' ? INCOME_CATEGORIES[0] : defaultExpenseCategory(), categorySuggested: true })} options={[{ value: 'despesa', label: 'Despesa' }, { value: 'receita', label: 'Receita' }]} ariaLabel="Tipo de movimentação importada" />
                        <SelectField value={row.category} onChange={(value) => updateRow(row.id, { category: value, categorySuggested: false })} options={categories} ariaLabel="Categoria importada" />
                        <SelectField value={row.paymentMethod} onChange={(value) => updateRow(row.id, { paymentMethod: value })} options={PAYMENT_METHODS} ariaLabel="Forma de pagamento importada" />
                        <PurpleDatePicker value={row.date} onChange={(value) => updateRow(row.id, { date: value })} ariaLabel={`Data de ${row.description}`} />
                      </div>
                      {Number(row.amount || 0) <= 0 && <div className="review-warning">Não encontramos um valor confiável neste arquivo. Informe o valor antes de selecionar.</div>}
                    </div>
                    <strong className={row.type === 'receita' ? 'review-value positive' : 'review-value'}>{row.type === 'receita' ? '+' : '-'}{money(row.amount)}</strong>
                    <button className="review-delete" aria-label="Remover movimentação" onClick={() => setRows((current) => current.filter((item) => item.id !== row.id))}><IconTrash size={16} /></button>
                  </article>
                )
              })}
            </div>
          </section>
        )}

        <footer className="sheet-footer"><button className="ghost-btn" onClick={onClose}>Fechar e continuar depois</button><button className="primary-btn" disabled={!selectedRows.length || processing || importing} onClick={importSelected}>{importing ? <IconLoader2 size={18} className="spin" /> : <IconCheck size={18} />}{importing ? 'Importando...' : `Importar ${selectedRows.length || ''} movimentações`}</button></footer>
      </div>
    </div>
  )
}
