import React, { useEffect, useRef, useState } from 'react'
import { IconCamera, IconDownload, IconFileInvoice, IconPlus, IconTrash, IconX } from '@tabler/icons-react'
import { receiptRepository } from '../../features/receipts/receipt.repository.ts'
import { recognizeImage, normalizeReceiptText } from '../../features/receipts/ocr.ts'
import { isSupabaseConfigured } from '../../infrastructure/supabase/client.ts'
import { formatCents, reaisToCents } from '../../domain/money/money.ts'
import FileUploadPanel from '../../components/ui/FileUploadPanel.jsx'
import PurpleDatePicker from '../../components/ui/PurpleDatePicker.jsx'
import SelectField from '../../components/ui/SelectField.jsx'

const ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp'

export default function ReceiptsPage() {
  const [rows, setRows] = useState([])
  const [files, setFiles] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [ocr, setOcr] = useState(null)
  const [form, setForm] = useState({ documentType: 'nota_fiscal', merchantName: '', documentDate: '', total: '', notes: '' })
  const cameraRef = useRef(null)

  async function reload() {
    if (!isSupabaseConfigured) { setLoading(false); return }
    setLoading(true)
    try { setRows(await receiptRepository.list()) }
    catch (err) { setError(err?.message || 'Não foi possível carregar os documentos.') }
    finally { setLoading(false) }
  }

  useEffect(() => { reload() }, [])

  function addFiles(list) {
    const incoming = Array.from(list || []).filter((file) => ['application/pdf','image/jpeg','image/png','image/webp'].includes(file.type))
    setFiles((current) => [...current, ...incoming].slice(0, 10))
  }

  function removeUpload(index) {
    setFiles((current) => current.filter((_, itemIndex) => itemIndex !== Number(index)))
  }

  function resetDialog() {
    setOpen(false)
    setFiles([])
    setOcr(null)
    setForm({ documentType: 'nota_fiscal', merchantName: '', documentDate: '', total: '', notes: '' })
  }

  async function runOcr(file) {
    if (!file?.type?.startsWith('image/')) return
    setOcr({ status: 'processing', progress: 0, text: '' })
    try {
      const result = await recognizeImage(file, (progress) => setOcr((state) => ({ ...(state || {}), status: 'processing', progress })))
      setOcr({ status: 'done', progress: 1, text: normalizeReceiptText(result.text), confidence: result.confidence })
    } catch (err) {
      setOcr({ status: 'failed', progress: 0, text: '', error: err?.message || 'OCR indisponível.' })
    }
  }

  async function save(event) {
    event.preventDefault()
    if (!files.length) { setError('Adicione pelo menos um PDF ou imagem.'); return }
    setSaving(true)
    setError('')
    try {
      await receiptRepository.create({
        merchantName: form.merchantName || undefined,
        documentType: form.documentType,
        documentDate: form.documentDate || undefined,
        totalAmountCents: form.total ? reaisToCents(form.total) : undefined,
        notes: [form.notes, ocr?.text ? `OCR:\n${ocr.text}` : ''].filter(Boolean).join('\n\n') || undefined,
      }, files.map((file, index) => ({ file, pageOrder: index })))
      resetDialog()
      await reload()
    } catch (err) { setError(err?.message || 'Não foi possível salvar o documento.') }
    finally { setSaving(false) }
  }

  async function download(file) {
    try {
      const blob = await receiptRepository.download(file.storage_path)
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = file.original_filename || 'documento'
      anchor.click()
      URL.revokeObjectURL(url)
    } catch (err) { setError(err?.message || 'Não foi possível baixar o arquivo.') }
  }

  async function remove(row) {
    if (!window.confirm('Excluir este documento? A movimentação vinculada não será excluída.')) return
    try { await receiptRepository.removeReceipt(row.id); await reload() }
    catch (err) { setError(err?.message || 'Não foi possível excluir o documento.') }
  }

  return <div className="page-stack">
    <div className="page-intro crud-intro"><div><span className="eyebrow">Documentos privados</span><h1>Notas e comprovantes</h1><p>Guarde PDF, imagem ou foto da câmera, preserve o original e vincule aos seus dados financeiros.</p></div><button className="primary-btn" onClick={() => setOpen(true)}><IconPlus size={17}/> Adicionar documento</button></div>
    {!isSupabaseConfigured && <div className="inline-alert">Notas e comprovantes exigem Supabase Storage privado. O modo demo não envia documentos.</div>}
    {error && <div className="inline-alert">{error}</div>}

    {loading ? <div className="panel crud-loading">Carregando...</div> : rows.length === 0 ? <div className="panel empty-block"><IconFileInvoice size={28}/><strong>Nenhum documento salvo</strong><p>Adicione uma nota, cupom, recibo ou comprovante.</p></div> : <div className="receipt-grid">{rows.map((row) => <article className="panel receipt-card" key={row.id}><div className="receipt-head"><span className="receipt-icon"><IconFileInvoice size={20}/></span><div><strong>{row.merchant_name || 'Documento sem estabelecimento'}</strong><p>{row.document_type?.replaceAll('_',' ')} · {row.document_date || 'sem data'}</p></div></div><div className="receipt-value">{row.total_amount_cents == null ? 'Valor não informado' : formatCents(row.total_amount_cents)}</div><div className="receipt-files">{(row.receipt_files || []).map((file) => <button key={file.id} className="ghost-btn" onClick={() => download(file)}><IconDownload size={15}/> {file.original_filename}</button>)}</div><button className="icon-btn danger receipt-delete" onClick={() => remove(row)} aria-label="Excluir documento"><IconTrash size={17}/></button></article>)}</div>}

    {open && <div className="modal-backdrop" role="presentation"><section className="crud-dialog receipt-dialog" role="dialog" aria-modal="true" aria-label="Adicionar documento"><div className="dialog-head"><div><span className="eyebrow">Nota, cupom ou comprovante</span><h2>Adicionar documento</h2></div><button className="icon-btn" onClick={resetDialog} aria-label="Fechar"><IconX size={19}/></button></div><form className="crud-form" onSubmit={save}>
      <label><span>Tipo</span><SelectField value={form.documentType} onChange={(value) => setForm((p) => ({...p, documentType:value}))} options={[{value:'nota_fiscal',label:'Nota fiscal'},{value:'cupom',label:'Cupom'},{value:'recibo',label:'Recibo'},{value:'comprovante',label:'Comprovante'},{value:'outro',label:'Outro'}]} ariaLabel="Tipo do documento" /></label>
      <label><span>Estabelecimento</span><input value={form.merchantName} onChange={(e)=>setForm((p)=>({...p,merchantName:e.target.value}))}/></label>
      <label><span>Data</span><PurpleDatePicker value={form.documentDate} onChange={(value)=>setForm((p)=>({...p,documentDate:value}))} placeholder="Selecionar data" ariaLabel="Data do documento" /></label>
      <label><span>Valor total</span><input inputMode="decimal" placeholder="0,00" value={form.total} onChange={(e)=>setForm((p)=>({...p,total:e.target.value}))}/></label>
      <label className="full"><span>Observação</span><textarea rows="3" value={form.notes} onChange={(e)=>setForm((p)=>({...p,notes:e.target.value}))}/></label>
      <div className="full file-uploader"><FileUploadPanel items={files} onFilesAdded={addFiles} onFileRemove={removeUpload} maxFiles={10} maxSizeMB={20} accept={ACCEPT} helper="Arraste PDFs ou imagens, ou clique para escolher da galeria."/><input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={(e)=>{ addFiles(e.target.files); e.target.value='' }} hidden/><div className="camera-upload-row"><button type="button" className="ghost-btn" onClick={() => cameraRef.current?.click()}><IconCamera size={17}/> Tirar foto</button>{files.some((file)=>file.type.startsWith('image/'))&&<button type="button" className="ghost-btn" onClick={()=>runOcr(files.find((file)=>file.type.startsWith('image/')))}>Executar OCR na primeira imagem</button>}</div>{ocr && <div className={`ocr-status ${ocr.status}`}><strong>{ocr.status==='processing'?'Lendo imagem...':ocr.status==='done'?'Texto extraído':'OCR falhou, mas o documento ainda pode ser salvo'}</strong>{ocr.status==='processing'&&<progress value={ocr.progress} max="1"/>}{ocr.text&&<pre>{ocr.text.slice(0,1500)}</pre>}</div>}</div>
      <div className="dialog-actions full"><button type="button" className="ghost-btn" onClick={resetDialog}>Cancelar</button><button className="primary-btn" disabled={saving}>{saving?'Salvando...':'Salvar original'}</button></div>
    </form></section></div>}
  </div>
}
