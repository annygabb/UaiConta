import React, { useEffect, useRef, useState } from 'react'
import { IconCamera, IconDownload, IconFileInvoice, IconPlus, IconTrash, IconX } from '@tabler/icons-react'
import { receiptRepository } from '../../features/receipts/receipt.repository.ts'
import { recognizeImage, normalizeReceiptText } from '../../features/receipts/ocr.ts'
import { parseStructuredReceipt, reconcileReceipt } from '../../features/receipts/structuredReceipt.ts'
import { extractPdfPageTexts, rasterizePdfPages } from '../../pdfParserFree.js'
import { isSupabaseConfigured } from '../../infrastructure/supabase/client.ts'
import { formatCents, reaisToCents } from '../../domain/money/money.ts'
import FileUploadPanel from '../../components/ui/FileUploadPanel.jsx'
import PurpleDatePicker from '../../components/ui/PurpleDatePicker.jsx'
import SelectField from '../../components/ui/SelectField.jsx'
import { CATEGORIES, PAYMENT_METHODS } from '../../constants.js'

const ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp'

export default function ReceiptsPage() {
  const [rows, setRows] = useState([])
  const [files, setFiles] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [ocr, setOcr] = useState(null)
  const [structured, setStructured] = useState(null)
  const [importBatchId, setImportBatchId] = useState(() => crypto.randomUUID())
  const [form, setForm] = useState({ documentType: 'nota_fiscal', merchantName: '', documentDate: '', total: '', category: 'Não categorizado', paymentMethod: 'Não identificado', notes: '' })
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
    setStructured(null)
    setImportBatchId(crypto.randomUUID())
    setForm({ documentType: 'nota_fiscal', merchantName: '', documentDate: '', total: '', category: 'Não categorizado', paymentMethod: 'Não identificado', notes: '' })
  }

  async function runOcr() {
    if (!files.length) return
    setOcr({ status: 'processing', progress: 0, text: '' })
    try {
      const parts = []
      const confidences = []
      for (let fileIndex = 0; fileIndex < files.length; fileIndex += 1) {
        const file = files[fileIndex]
        if (file.type === 'application/pdf' || file.name?.toLowerCase().endsWith('.pdf')) {
          const pageTexts = await extractPdfPageTexts(file)
          if (pageTexts.length > 20) throw new Error(`${file.name}: a leitura estruturada aceita até 20 páginas por PDF. Divida o documento e tente novamente.`)
          const scannedPages = pageTexts.filter((page) => normalizeReceiptText(page.text).length < 20).map((page) => page.pageNumber)
          const rendered = scannedPages.length ? await rasterizePdfPages(file, scannedPages) : []
          let renderedIndex = 0
          for (let pageIndex = 0; pageIndex < pageTexts.length; pageIndex += 1) {
            const page = pageTexts[pageIndex]
            if (!scannedPages.includes(page.pageNumber)) { parts.push(page.text); confidences.push(80); continue }
            const result = await recognizeImage(rendered[renderedIndex], (progress) => setOcr((state) => ({ ...(state || {}), status: 'processing', progress: (fileIndex + (pageIndex + progress) / pageTexts.length) / files.length })))
            renderedIndex += 1; parts.push(result.text); confidences.push(result.confidence)
          }
        } else {
          const result = await recognizeImage(file, (progress) => setOcr((state) => ({ ...(state || {}), status: 'processing', progress: (fileIndex + progress) / files.length })))
          parts.push(result.text); confidences.push(result.confidence)
        }
      }
      const text = normalizeReceiptText(parts.join('\n'))
      const confidence = confidences.length ? confidences.reduce((sum, value) => sum + value, 0) / confidences.length : 0
      const parsed = parseStructuredReceipt(text)
      setStructured(parsed)
      setForm((current) => ({ ...current, merchantName: parsed.merchantName, documentDate: parsed.documentDate || current.documentDate, total: parsed.totalAmountCents ? (parsed.totalAmountCents / 100).toFixed(2).replace('.', ',') : current.total, paymentMethod: parsed.paymentMethod }))
      setOcr({ status: 'done', progress: 1, text, confidence })
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
      if (!form.documentDate) throw new Error('Confirme a data da compra antes de continuar.')
      if (!form.total || reaisToCents(form.total) <= 0) throw new Error('Confirme um valor total maior que zero.')
      if (!structured) throw new Error('Leia o documento e revise os dados antes de confirmar.')
      const reviewedTotalCents = reaisToCents(form.total)
      const balance = reconcileReceipt({ ...structured, totalAmountCents: reviewedTotalCents })
      if (!balance.balanced && !window.confirm(`A soma dos itens difere do total em ${formatCents(Math.abs(balance.differenceCents))}. Deseja confirmar mesmo assim?`)) return
      await receiptRepository.createStructured({
        importBatchId,
        merchantName: form.merchantName || undefined,
        documentType: form.documentType,
        documentDate: form.documentDate || undefined,
        totalAmountCents: reviewedTotalCents,
        notes: form.notes || undefined,
        paymentMethod: form.paymentMethod,
        category: form.category,
        items: structured.items,
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
      <label><span>Categoria</span><SelectField value={form.category} onChange={(value)=>setForm((p)=>({...p,category:value}))} options={CATEGORIES.map((value)=>({value,label:value}))} ariaLabel="Categoria da compra" /></label>
      <label><span>Forma de pagamento</span><SelectField value={form.paymentMethod} onChange={(value)=>setForm((p)=>({...p,paymentMethod:value}))} options={PAYMENT_METHODS.map((value)=>({value,label:value}))} ariaLabel="Forma de pagamento" /></label>
      <label className="full"><span>Observação</span><textarea rows="3" value={form.notes} onChange={(e)=>setForm((p)=>({...p,notes:e.target.value}))}/></label>
      <div className="full file-uploader"><FileUploadPanel items={files} onFilesAdded={addFiles} onFileRemove={removeUpload} maxFiles={10} maxSizeMB={20} accept={ACCEPT} helper="Arraste PDFs ou imagens, ou clique para escolher da galeria."/><input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={(e)=>{ addFiles(e.target.files); e.target.value='' }} hidden/><div className="camera-upload-row"><button type="button" className="ghost-btn" onClick={() => cameraRef.current?.click()}><IconCamera size={17}/> Tirar foto</button>{files.length>0&&<button type="button" className="ghost-btn" onClick={runOcr}>Ler e estruturar todos os arquivos</button>}</div>{ocr && <div className={`ocr-status ${ocr.status}`}><strong>{ocr.status==='processing'?'Lendo documento...':ocr.status==='done'?'Dados extraídos para revisão':'A leitura falhou; tente outra imagem ou PDF'}</strong>{ocr.status==='processing'&&<progress value={ocr.progress} max="1"/>}</div>}{structured&&<div className="receipt-review"><div className="receipt-review-head"><strong>Itens reconhecidos</strong><span>{structured.items.length} itens</span></div>{structured.warnings.map((warning)=><p className="inline-alert" key={warning}>{warning}</p>)}{structured.items.map((item,index)=><div className="receipt-item-row" key={`${item.description}-${index}`}><input aria-label={`Descrição do item ${index+1}`} value={item.description} onChange={(event)=>setStructured((current)=>({...current,items:current.items.map((entry,itemIndex)=>itemIndex===index?{...entry,description:event.target.value}:entry)}))}/><input aria-label={`Quantidade do item ${index+1}`} type="number" min="0.001" step="0.001" value={item.quantity} onChange={(event)=>setStructured((current)=>({...current,items:current.items.map((entry,itemIndex)=>itemIndex===index?{...entry,quantity:Number(event.target.value)}:entry)}))}/><input aria-label={`Total do item ${index+1}`} inputMode="decimal" value={(item.totalPriceCents/100).toFixed(2).replace('.',',')} onChange={(event)=>setStructured((current)=>({...current,items:current.items.map((entry,itemIndex)=>itemIndex===index?{...entry,totalPriceCents:reaisToCents(event.target.value)}:entry)}))}/><button type="button" className="icon-btn" aria-label={`Remover item ${index+1}`} onClick={()=>setStructured((current)=>({...current,items:current.items.filter((_,itemIndex)=>itemIndex!==index)}))}><IconTrash size={16}/></button></div>)}<button type="button" className="ghost-btn" onClick={()=>setStructured((current)=>({...current,items:[...current.items,{description:'Novo item',quantity:1,unitPriceCents:null,totalPriceCents:0,confidence:'baixa'}]}))}><IconPlus size={16}/> Adicionar item</button></div>}</div>
      <div className="dialog-actions full"><button type="button" className="ghost-btn" onClick={resetDialog}>Cancelar</button><button className="primary-btn" disabled={saving||!structured}>{saving?'Confirmando...':'Confirmar nota e despesa'}</button></div>
    </form></section></div>}
  </div>
}
