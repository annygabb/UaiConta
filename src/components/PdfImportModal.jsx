import React, { useMemo, useRef, useState } from "react";
import { AlertTriangle, Check, FileText, Loader2, Plus, RefreshCcw, Trash2, UploadCloud, X } from "lucide-react";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, PAYMENT_METHODS } from "../constants.js";
import { extractTransactionsFromPDFFree, markPossibleDuplicates } from "../pdfParserFree.js";
import { dateLabel, money } from "../utils.js";
import { Badge } from "./Common.jsx";

function isPdf(file) {
  return file?.type === "application/pdf" || file?.name?.toLowerCase().endsWith(".pdf");
}

export default function PdfImportModal({ existingTransactions, onClose, onImport }) {
  const inputRef = useRef(null);
  const queueRef = useRef([]);
  const workerRef = useRef(false);
  const processedRef = useRef([]);
  const [files, setFiles] = useState([]);
  const [rows, setRows] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState("");

  const selectedRows = useMemo(() => rows.filter((row) => row.__selected && !row.__possibleDuplicate), [rows]);

  async function addFiles(list) {
    const incoming = Array.from(list || []).filter(isPdf);
    if (!incoming.length) {
      setMessage("Selecione arquivos em formato PDF.");
      return;
    }
    const additions = incoming.map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`,
      file,
      name: file.name,
      status: "pendente",
      count: 0,
      error: "",
    }));
    setFiles((current) => [...current, ...additions]);
    setMessage("");
    queueRef.current.push(...additions);
    await drainQueue();
  }

  async function drainQueue() {
    if (workerRef.current) return;
    workerRef.current = true;
    setProcessing(true);
    try {
      while (queueRef.current.length) {
        const item = queueRef.current.shift();
        setFiles((current) => current.map((entry) => entry.id === item.id ? { ...entry, status: "processando", error: "" } : entry));
        try {
          const parsed = await extractTransactionsFromPDFFree(item.file);
          const marked = markPossibleDuplicates(parsed, [...existingTransactions, ...processedRef.current])
            .map((row) => ({ ...row, __selected: !row.__possibleDuplicate }));
          processedRef.current.push(...marked);
          setRows((current) => [...current, ...marked]);
          setFiles((current) => current.map((entry) => entry.id === item.id ? { ...entry, status: "processado", count: parsed.length } : entry));
        } catch (error) {
          setFiles((current) => current.map((entry) => entry.id === item.id ? { ...entry, status: "erro", error: error?.message || "Falha ao ler PDF." } : entry));
        }
      }
    } finally {
      workerRef.current = false;
      setProcessing(false);
    }
  }

  function updateRow(id, patch) {
    setRows((current) => current.map((row) => row.id === id ? { ...row, ...patch } : row));
  }

  function removeFile(id) {
    const file = files.find((entry) => entry.id === id);
    queueRef.current = queueRef.current.filter((entry) => entry.id !== id);
    setFiles((current) => current.filter((entry) => entry.id !== id));
    if (file) {
      setRows((current) => current.filter((row) => row.sourceFile !== file.name));
      processedRef.current = processedRef.current.filter((row) => row.sourceFile !== file.name);
    }
  }

  async function retryFile(id) {
    const file = files.find((entry) => entry.id === id);
    if (!file) return;
    setRows((current) => current.filter((row) => row.sourceFile !== file.name));
    processedRef.current = processedRef.current.filter((row) => row.sourceFile !== file.name);
    queueRef.current.push(file);
    await drainQueue();
  }

  async function importSelected() {
    if (!selectedRows.length || importing) return;
    setImporting(true);
    try {
      await onImport(selectedRows.map(({ __selected, __possibleDuplicate, ...row }) => row));
      onClose();
    } finally {
      setImporting(false);
    }
  }

  const hasProcessed = files.some((file) => file.status === "processado");

  return (
    <div className="modal-backdrop">
      <div className="pdf-sheet" role="dialog" aria-modal="true" aria-labelledby="pdf-title">
        <header className="sheet-header">
          <div>
            <span className="eyebrow">Importação local</span>
            <h2 id="pdf-title">Adicionar por PDF</h2>
            <p>Leitura feita no seu navegador com pdf.js. Nenhum documento é enviado para IA.</p>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Fechar"><X size={19} /></button>
        </header>

        <button
          type="button"
          className="pdf-dropzone"
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => { event.preventDefault(); addFiles(event.dataTransfer.files); }}
        >
          <UploadCloud size={25} />
          <strong>Arraste seus PDFs aqui</strong>
          <span>ou clique para selecionar quantos arquivos quiser</span>
          <small>Os arquivos são processados em fila para manter o sistema rápido.</small>
        </button>
        <input ref={inputRef} type="file" accept="application/pdf,.pdf" multiple hidden onChange={(event) => { addFiles(event.target.files); event.target.value = ""; }} />
        {message && <div className="inline-alert"><AlertTriangle size={16} /> {message}</div>}

        {files.length > 0 && (
          <section className="pdf-file-list" aria-label="Arquivos adicionados">
            <div className="section-line"><strong>{files.length} PDF{files.length > 1 ? "s" : ""} adicionado{files.length > 1 ? "s" : ""}</strong><button onClick={() => inputRef.current?.click()}><Plus size={15} /> Adicionar mais</button></div>
            {files.map((item) => (
              <div className="pdf-file" key={item.id}>
                <span className="pdf-file-icon"><FileText size={18} /></span>
                <div className="pdf-file-copy"><strong>{item.name}</strong><small>{item.status === "processado" ? `${item.count} movimentações encontradas` : item.status === "erro" ? item.error : item.status === "processando" ? "Lendo documento..." : "Na fila"}</small></div>
                <div className="pdf-file-actions">
                  {item.status === "processando" && <Loader2 size={17} className="spin" />}
                  {item.status === "processado" && <Check size={17} />}
                  {item.status === "erro" && <button aria-label="Tentar novamente" onClick={() => retryFile(item.id)}><RefreshCcw size={16} /></button>}
                  <button aria-label="Remover PDF" onClick={() => removeFile(item.id)}><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
          </section>
        )}

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
                const categories = row.type === "receita" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
                return (
                  <article className={row.__possibleDuplicate ? "review-row duplicate" : "review-row"} key={row.id}>
                    <input type="checkbox" checked={Boolean(row.__selected)} onChange={(event) => updateRow(row.id, { __selected: event.target.checked })} aria-label={`Selecionar ${row.description}`} />
                    <div className="review-main">
                      <input className="review-description" value={row.description} onChange={(event) => updateRow(row.id, { description: event.target.value })} />
                      <div className="review-meta">
                        <span>{dateLabel(row.date)}</span><span>{row.sourceFile}</span>
                        <Badge tone={row.confidence === "alta" ? "success" : row.confidence === "media" ? "warning" : "danger"}>confiança {row.confidence}</Badge>
                        {row.__possibleDuplicate && <Badge tone="danger">possível duplicado</Badge>}
                      </div>
                      <div className="review-fields">
                        <select value={row.type} onChange={(event) => updateRow(row.id, { type: event.target.value, category: event.target.value === "receita" ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0] })}>
                          <option value="despesa">Despesa</option><option value="receita">Receita</option>
                        </select>
                        <select value={row.category} onChange={(event) => updateRow(row.id, { category: event.target.value })}>{categories.map((item) => <option key={item}>{item}</option>)}</select>
                        <select value={row.paymentMethod} onChange={(event) => updateRow(row.id, { paymentMethod: event.target.value })}>{PAYMENT_METHODS.map((item) => <option key={item}>{item}</option>)}</select>
                        <input type="date" value={row.date} onChange={(event) => updateRow(row.id, { date: event.target.value })} />
                      </div>
                    </div>
                    <strong className={row.type === "receita" ? "review-value positive" : "review-value"}>{row.type === "receita" ? "+" : "-"}{money(row.amount)}</strong>
                    <button className="review-delete" aria-label="Remover movimentação" onClick={() => setRows((current) => current.filter((item) => item.id !== row.id))}><Trash2 size={15} /></button>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        <footer className="sheet-footer">
          <button className="ghost-btn" onClick={onClose}>Cancelar</button>
          <button className="primary-btn" disabled={!selectedRows.length || processing || importing} onClick={importSelected}>
            {importing ? <Loader2 size={17} className="spin" /> : <Check size={17} />}
            {importing ? "Importando..." : `Importar ${selectedRows.length || ""} movimentações`}
          </button>
        </footer>
        {!hasProcessed && processing && <div className="processing-note">Você pode continuar adicionando PDFs enquanto a fila é processada.</div>}
      </div>
    </div>
  );
}
