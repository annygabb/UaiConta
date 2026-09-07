import React, { useMemo, useRef, useState } from 'react'
import { IconAlertTriangle, IconCheck, IconLoader2, IconTrash, IconX } from '@tabler/icons-react'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, PAYMENT_METHODS } from '../constants.js'
import { extractTransactionsFromPDFFree, markPossibleDuplicates } from '../pdfParserFree.js'
import { dateLabel, money } from '../utils.js'
import { Badge } from './Common.jsx'
import FileUploadPanel from './ui/FileUploadPanel.jsx'
import PurpleCheckbox from './ui/PurpleCheckbox.jsx'
import PurpleDatePicker from './ui/PurpleDatePicker.jsx'
import SelectField from './ui/SelectField.jsx'

function isPdf(file) {
  return file?.type === 'application/pdf' || file?.name?.toLowerCase().endsWith('.pdf')
}

export default function PdfImportModal({ existingTransactions, onClose, onImport }) {
  const queueRef = useRef([])
  const workerRef = useRef(false)
  const processedRef = useRef([])
  const [files, setFiles] = useState([])
  const [rows, setRows] = useState([])
  const [processing, setProcessing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [message, setMessage] = useState('')

  const selectedRows = useMemo(() => rows.filter((row) => row.__selected && !row.__possibleDuplicate), [rows])

  async function addFiles(list) {
    const incoming = Array.from(list || []).filter(isPdf)
    if (!incoming.length) {
      setMessage('Selecione arquivos em formato PDF.')
      return
    }
    const additions = incoming.map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`,
      file,
      name: file.name,
      status: 'pendente',
      count: 0,
      error: '',
    }))
    setFiles((current) => [...current, ...additions])
    setMessage('')
    queueRef.current.push(...additions)
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
          const parsed = await extractTransactionsFromPDFFree(item.file)
          const marked = markPossibleDuplicates(parsed, [...existingTransactions, ...processedRef.current])
            .map((row) => ({ ...row, __selected: !row.__possibleDuplicate }))
          processedRef.current.push(...marked)
          setRows((current) => [...current, ...marked])
          setFiles((current) => current.map((entry) => entry.id === item.id ? { ...entry, status: 'processado', count: parsed.length } : entry))
        } catch (error) {
          setFiles((current) => current.map((entry) => entry.id === item.id ? { ...entry, status: 'erro', error: error?.message || 'Falha ao ler PDF.' } : entry))
        }
      }
    } finally {
      workerRef.current = false
      setProcessing(false)
    }
  }

  function updateRow(id, patch) {
    setRows((current) => current.map((row) => row.id === id ? { ...row, ...patch } : row))
  }

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
    queueRef.current.push(file)
    await drainQueue()
  }

  async function importSelected() {
    if (!selectedRows.length || importing) return
    setImporting(true)
    try {
      await onImport(selectedRows.map(({ __selected, __possibleDuplicate, ...row }) => row))
      onClose()
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="pdf-sheet" role="dialog" aria-modal="true" aria-labelledby="pdf-title">
        <header className="sheet-header">
          <div>
            <span className="eyebrow">Importação local</span>
            <h2 id="pdf-title">Adicionar por PDF</h2>
            <p>Leitura feita no seu navegador com pdf.js. Nenhum documento é enviado para IA.</p>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Fechar"><IconX size={20} /></button>
        </header>

        <FileUploadPanel
          items={files}
          onFilesAdded={addFiles}
          onFileRemove={removeFile}
          onRetry={retryFile}
          maxFiles={10}
          maxSizeMB={50}
          accept="application/pdf,.pdf"
          helper="Arraste seus PDFs aqui ou clique para selecionar. O processamento usa fila real, sem progresso fictício."
        />
        {message && <div className="inline-alert"><IconAlertTriangle size={17} /> {message}</div>}

        {rows.length > 0 && (
          <section className="pdf-review">
            <div className="section-line review-heading">
              <div><strong>Revise antes de importar</strong><small>{rows.length} itens encontrados · {selectedRows.length} selecionados</small></div>
              <div className="review-bulk">
                <button onClick={() => setRows((current) => current.map((row) => ({ ...row, __selected: !row.__possibleDuplicate })))}>Selecionar seguros</button>
                <button onClick={() => setRows((current) => current.map((row) => ({ ...row, __selected: false })))}>Limpar</button>
              </div>
            </div>
            <div className="review-list">
              {rows.map((row) => {
                const categories = row.type === 'receita' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
                return (
                  <article className={row.__possibleDuplicate ? 'review-row duplicate' : 'review-row'} key={row.id}>
                    <PurpleCheckbox checked={Boolean(row.__selected)} onCheckedChange={(checked) => updateRow(row.id, { __selected: checked })} ariaLabel={`Selecionar ${row.description}`} />
                    <div className="review-main">
                      <input className="review-description" value={row.description} onChange={(event) => updateRow(row.id, { description: event.target.value })} />
                      <div className="review-meta">
                        <span>{dateLabel(row.date)}</span><span>{row.sourceFile}</span>
                        <Badge tone={row.confidence === 'alta' ? 'success' : row.confidence === 'media' ? 'warning' : 'danger'}>confiança {row.confidence}</Badge>
                        {row.__possibleDuplicate && <Badge tone="danger">possível duplicado</Badge>}
                      </div>
                      <div className="review-fields">
                        <SelectField
                          value={row.type}
                          onChange={(value) => updateRow(row.id, { type: value, category: value === 'receita' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0] })}
                          options={[{ value: 'despesa', label: 'Despesa' }, { value: 'receita', label: 'Receita' }]}
                          ariaLabel="Tipo de movimentação importada"
                        />
                        <SelectField value={row.category} onChange={(value) => updateRow(row.id, { category: value })} options={categories} ariaLabel="Categoria importada" />
                        <SelectField value={row.paymentMethod} onChange={(value) => updateRow(row.id, { paymentMethod: value })} options={PAYMENT_METHODS} ariaLabel="Forma de pagamento importada" />
                        <PurpleDatePicker value={row.date} onChange={(value) => updateRow(row.id, { date: value })} ariaLabel={`Data de ${row.description}`} />
                      </div>
                    </div>
                    <strong className={row.type === 'receita' ? 'review-value positive' : 'review-value'}>{row.type === 'receita' ? '+' : '-'}{money(row.amount)}</strong>
                    <button className="review-delete" aria-label="Remover movimentação" onClick={() => setRows((current) => current.filter((item) => item.id !== row.id))}><IconTrash size={16} /></button>
                  </article>
                )
              })}
            </div>
          </section>
        )}

        <footer className="sheet-footer">
          <button className="ghost-btn" onClick={onClose}>Cancelar</button>
          <button className="primary-btn" disabled={!selectedRows.length || processing || importing} onClick={importSelected}>
            {importing ? <IconLoader2 size={18} className="spin" /> : <IconCheck size={18} />}
            {importing ? 'Importando...' : `Importar ${selectedRows.length || ''} movimentações`}
          </button>
        </footer>
      </div>
    </div>
  )
}
