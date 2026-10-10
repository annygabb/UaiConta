import pdfjsWorkerUrl from 'pdfjs-dist/legacy/build/pdf.worker.mjs?url'
import { CATEGORIES, INCOME_CATEGORIES, PAYMENT_METHODS } from './constants.js'
import { isoDate, normalizeDescription, uid } from './utils.js'
import { resolveTransactionDate, scanMonthAnchors } from './features/import/dateResolution'
import { findDuplicateCandidates } from './features/import/duplicateDetection'

const MONTHS_PT = {
  jan: '01', fev: '02', mar: '03', abr: '04', mai: '05', jun: '06',
  jul: '07', ago: '08', set: '09', out: '10', nov: '11', dez: '12',
}

const INCOME_KEYWORDS = [
  'recebido', 'recebida', 'salário', 'salario', 'depósito', 'deposito',
  'estorno', 'reembolso', 'transferência recebida', 'transferencia recebida',
  'crédito em conta', 'credito em conta', 'rendimento', 'cashback',
]

const CATEGORY_KEYWORDS = {
  Supermercado: ['supermercado', 'mercado', 'atacad', 'hortifruti'],
  Alimentação: ['restaurante', 'lanchonete', 'ifood', 'padaria', 'pizzaria', 'cafe', 'café'],
  Transporte: ['uber', '99app', 'posto', 'combustivel', 'combustível', 'estacionamento', 'pedagio', 'pedágio'],
  Faculdade: ['faculdade', 'universidade', 'mensalidade escolar', 'curso'],
  Saúde: ['farmacia', 'farmácia', 'hospital', 'clinica', 'clínica', 'laboratorio', 'laboratório'],
  Psicóloga: ['psicolog'],
  Personal: ['personal trainer', 'academia', 'personal'],
  Lazer: ['cinema', 'streaming', 'netflix', 'spotify', 'teatro'],
  Diversão: ['bar ', 'balada', 'show', 'evento'],
}

const PAYMENT_KEYWORDS = {
  Pix: [' pix ', 'pix enviado', 'pix recebido', 'pagamento pix'],
  'Cartão de crédito': ['cartao de credito', 'cartão de crédito', 'compra credito', 'compra crédito'],
  'Cartão de débito': ['cartao de debito', 'cartão de débito', 'compra debito', 'compra débito'],
  Dinheiro: ['dinheiro', 'especie', 'espécie'],
  Boleto: ['boleto'],
  Transferência: ['transferencia', 'transferência', 'ted ', 'doc '],
}

const INFORMATIONAL_PATTERNS = [
  /limite\s+(total|dispon[ií]vel).*cart[aã]o/i,
  /valor\s+m[ií]nimo/i,
  /pagar\s+menos\s+que\s+o\s+valor\s+m[ií]nimo/i,
  /deixar\s+a\s+fatura\s+atrasar/i,
  /encargos|juros\s+do\s+rotativo|multa\s+de\s+atraso/i,
  /central\s+de\s+atendimento|sac\b|ouvidoria/i,
  /melhor\s+data\s+de\s+compra|data\s+de\s+fechamento/i,
  /instru[cç][oõ]es\s+de\s+pagamento|formas?\s+de\s+pagamento\s+da\s+fatura/i,
  /parcelamento\s+da\s+fatura|op[cç][oõ]es\s+de\s+parcelamento/i,
  /taxa\s+efetiva|custo\s+efetivo\s+total|\bcet\b/i,
  /contrato|termos\s+e\s+condi[cç][oõ]es|aviso\s+legal/i,
  /este\s+documento|consulte\s+seu\s+contrato/i,
  /vencimento\s+da\s+fatura|total\s+da\s+fatura|pagamento\s+m[ií]nimo/i,
  /^saldo\s+(?:dispon[ií]vel|atual|anterior)\b/i,
  /^total\s+(?:do\s+per[ií]odo|de\s+entradas|de\s+sa[ií]das)\b/i,
]

const HEADER_PATTERNS = [
  /^data\s+descri[cç][aã]o\s+valor/i,
  /^lan[cç]amentos?/i,
  /^resumo\s+da\s+fatura/i,
]

let pdfjsPromise

export function ensurePdfRuntimeCompatibility() {
  if (typeof Promise.withResolvers !== 'function') {
    Promise.withResolvers = function withResolvers() {
      let resolve
      let reject
      const promise = new Promise((res, rej) => {
        resolve = res
        reject = rej
      })
      return { promise, resolve, reject }
    }
  }

  // Keep this fallback for older cached PDF worker bundles. Current PDF.js 4
  // does not require the method, but an open PWA can briefly mix old and new
  // assets while the service worker activates.
  if (typeof ArrayBuffer !== 'undefined' && typeof ArrayBuffer.prototype.transferToFixedLength !== 'function') {
    Object.defineProperty(ArrayBuffer.prototype, 'transferToFixedLength', {
      configurable: true,
      writable: true,
      value(newLength = this.byteLength) {
        const length = Number(newLength)
        if (!Number.isInteger(length) || length < 0) throw new RangeError('Invalid ArrayBuffer length')
        const result = new ArrayBuffer(length)
        const source = new Uint8Array(this, 0, Math.min(this.byteLength, length))
        new Uint8Array(result).set(source)
        return result
      },
    })
  }
}

export function shouldUseMainThreadPdfWorker(userAgent = globalThis.navigator?.userAgent || '') {
  return /AppleWebKit/i.test(userAgent) && !/Android/i.test(userAgent)
}

async function getPdfJs() {
  ensurePdfRuntimeCompatibility()
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      // Apple browsers share WebKit and can keep a stale worker alive while a
      // PWA updates. Running the handler on the main context avoids mixing
      // worker runtimes and preserves the local-only import flow.
      if (shouldUseMainThreadPdfWorker()) {
        const { WorkerMessageHandler } = await import('pdfjs-dist/legacy/build/pdf.worker.mjs')
        globalThis.pdfjsWorker = { WorkerMessageHandler }
      }
      const module = await import('pdfjs-dist/legacy/build/pdf.mjs')
      module.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl
      return module
    })()
  }
  return pdfjsPromise
}

function readWithFileReader(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error || new Error('Não foi possível ler o arquivo no Safari.'))
    reader.onabort = () => reject(new Error('A leitura do PDF foi interrompida.'))
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) resolve(reader.result)
      else reject(new Error('O navegador devolveu um formato inesperado ao ler o PDF.'))
    }
    reader.readAsArrayBuffer(file)
  })
}

export async function readPdfFileAsArrayBuffer(file) {
  if (!file) throw new Error('Selecione um arquivo PDF válido.')
  const failures = []

  // FileReader is the most reliable path for Files selected from iCloud Drive
  // and the Files app in iOS Safari/PWAs. Other browsers keep two fallbacks.
  if (typeof FileReader !== 'undefined') {
    try { return await readWithFileReader(file) }
    catch (error) { failures.push(error) }
  }
  if (typeof file.arrayBuffer === 'function') {
    try { return await file.arrayBuffer() }
    catch (error) { failures.push(error) }
  }
  if (typeof Response !== 'undefined') {
    try { return await new Response(file).arrayBuffer() }
    catch (error) { failures.push(error) }
  }

  throw new Error('Não foi possível acessar os dados deste PDF no dispositivo.', { cause: failures.at(-1) })
}

function padded(text) {
  return ` ${String(text).toLowerCase().replace(/\s+/g, ' ')} `
}

function guessFromKeywords(text, dict, fallback) {
  const lower = padded(text)
  for (const [label, words] of Object.entries(dict)) {
    if (words.some((word) => lower.includes(word))) return { label, matched: true }
  }
  return { label: fallback, matched: false }
}

function createFinancialRow({ date, amount, rawDescription, description, sourceFile, dateResolution }) {
  const lower = description.toLowerCase()
  const type = INCOME_KEYWORDS.some((keyword) => lower.includes(keyword)) ? 'receita' : 'despesa'
  const categoryGuess = type === 'receita'
    ? { label: INCOME_CATEGORIES.includes('Outras receitas') ? 'Outras receitas' : INCOME_CATEGORIES[0], matched: false }
    : guessFromKeywords(description, CATEGORY_KEYWORDS, 'Não categorizado')
  const paymentGuess = guessFromKeywords(description, PAYMENT_KEYWORDS, 'Não identificado')
  const matchedSignals = Number(categoryGuess.matched) + Number(paymentGuess.matched) + Number(description.length >= 4 && description.length <= 120)

  const resolvedDate = dateResolution || {
    value: date,
    rule: 'line_full_date',
    source: { kind: 'line_text' },
    confidence: 'alta',
    evidence: date,
    ambiguous: false,
  }
  const amountCents = Math.round(amount * 100)
  const confidence = matchedSignals >= 3 ? 'alta' : matchedSignals === 2 ? 'media' : 'baixa'

  return {
    id: uid(),
    type,
    amount,
    amountCents,
    rawDescription,
    description,
    category: type === 'receita'
      ? categoryGuess.label
      : (CATEGORIES.includes(categoryGuess.label) ? categoryGuess.label : 'Não categorizado'),
    paymentMethod: PAYMENT_METHODS.includes(paymentGuess.label) ? paymentGuess.label : 'Não identificado',
    date,
    status: 'completed',
    isRecurring: false,
    notes: '',
    source: 'pdf',
    sourceFile,
    confidence,
    dateResolution: resolvedDate,
    fieldEvidence: {
      type: {
        value: type,
        source: { kind: 'system_suggestion' },
        confidence: 'media',
        evidence: rawDescription,
      },
      amountCents: {
        value: amountCents,
        source: { kind: 'line_text' },
        confidence: 'alta',
        evidence: rawDescription,
      },
      description: {
        value: description,
        source: { kind: 'line_text' },
        confidence: 'alta',
        evidence: rawDescription,
      },
      date: resolvedDate,
      category: {
        value: categoryGuess.label,
        source: { kind: 'system_suggestion' },
        confidence: categoryGuess.matched ? 'alta' : 'baixa',
        evidence: rawDescription,
      },
      paymentMethod: {
        value: paymentGuess.label,
        source: { kind: 'system_suggestion' },
        confidence: paymentGuess.matched ? 'alta' : 'baixa',
        evidence: rawDescription,
      },
    },
    requiresReview: Boolean(resolvedDate.ambiguous || !resolvedDate.value || !amountCents || description.length < 2),
    __imported: true,
    __method: 'local-pdfjs',
  }
}

export function normalizeAmount(raw) {
  const cleaned = String(raw).replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '')
  const number = Number(cleaned)
  return Number.isFinite(number) ? Math.abs(number) : null
}

export function normalizeDate(raw, referenceYear = new Date().getFullYear()) {
  const value = String(raw).trim()
  const slash = value.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/)
  if (slash) {
    const [, day, month, yearRaw] = slash
    let year = yearRaw ? Number(yearRaw) : referenceYear
    if (year < 100) year += 2000
    const date = new Date(year, Number(month) - 1, Number(day))
    if (!Number.isNaN(date.getTime()) && date.getMonth() === Number(month) - 1 && date.getDate() === Number(day)) return isoDate(date)
  }
  const monthName = value.match(/^(\d{1,2})\s*(?:de\s*)?([a-zç]{3})/i)
  if (monthName) {
    const [, day, monthRaw] = monthName
    const month = MONTHS_PT[monthRaw.toLowerCase().slice(0, 3)]
    if (month) {
      const date = new Date(referenceYear, Number(month) - 1, Number(day))
      if (!Number.isNaN(date.getTime())) return isoDate(date)
    }
  }
  return null
}

export function isInformationalChunk(text) {
  const normalized = String(text).replace(/\s+/g, ' ').trim()
  if (!normalized) return true
  return INFORMATIONAL_PATTERNS.some((pattern) => pattern.test(normalized)) || HEADER_PATTERNS.some((pattern) => pattern.test(normalized))
}

export function displayDescriptionFromRaw(raw) {
  return String(raw)
    .replace(/\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/g, ' ')
    .replace(/\b\d{1,2}\s+(?:de\s+)?(?:jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)[a-zç]*\b/gi, ' ')
    .replace(/-?R?\$?\s?(?:\d{1,3}(?:\.\d{3})+|\d+),\d{2}/g, ' ')
    .replace(/\b(?:final|cart[aã]o)\s*\*?\d{2,4}\b/gi, ' ')
    .replace(/[|•]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120)
}

async function extractRawText(file) {
  const pdfjsLib = await getPdfJs()
  const buffer = await readPdfFileAsArrayBuffer(file)
  const data = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
  const loadingTask = pdfjsLib.getDocument({ data, isEvalSupported: false, useWorkerFetch: false })
  const pdf = await loadingTask.promise
  let fullText = ''
  try {
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber)
      const content = await page.getTextContent()
      let previousY = null
      const lines = []
      let current = []
      for (const item of content.items) {
        const y = Math.round(item.transform?.[5] || 0)
        if (previousY !== null && Math.abs(y - previousY) > 3 && current.length) {
          lines.push(current.join(' '))
          current = []
        }
        current.push(item.str || '')
        previousY = y
      }
      if (current.length) lines.push(current.join(' '))
      fullText += `${lines.join('\n')}\n`
      page.cleanup?.()
    }
  } finally {
    await pdf.destroy?.()
  }
  return fullText
}

/** Extrai o texto visual do PDF localmente, preservando linhas para cupons/notas. */
export async function extractTextFromPDFFree(file) {
  if (!file || (file.type !== 'application/pdf' && !file.name?.toLowerCase().endsWith('.pdf'))) throw new Error('Selecione um arquivo PDF válido.')
  return extractRawText(file)
}

export async function extractPdfPageTexts(file) {
  const pdfjsLib = await getPdfJs()
  const buffer = await readPdfFileAsArrayBuffer(file)
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer), isEvalSupported: false, useWorkerFetch: false })
  const pdf = await loadingTask.promise
  const pages = []
  try {
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber)
      const content = await page.getTextContent()
      pages.push({ pageNumber, text: content.items.map((item) => item.str || '').join(' ').replace(/\s+/g, ' ').trim() })
      page.cleanup?.()
    }
  } finally { await pdf.destroy?.() }
  return pages
}

/** Rasteriza páginas localmente para OCR quando o PDF não possui camada de texto. */
export async function rasterizePdfPages(file, pageNumbers = []) {
  const pdfjsLib = await getPdfJs()
  const buffer = await readPdfFileAsArrayBuffer(file)
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer), isEvalSupported: false, useWorkerFetch: false })
  const pdf = await loadingTask.promise
  const images = []
  try {
    const requested = pageNumbers.length ? pageNumbers : Array.from({ length: pdf.numPages }, (_, index) => index + 1)
    for (const pageNumber of requested) {
      const page = await pdf.getPage(pageNumber)
      const viewport = page.getViewport({ scale: 1.7 })
      const canvas = document.createElement('canvas')
      canvas.width = Math.ceil(viewport.width)
      canvas.height = Math.ceil(viewport.height)
      const context = canvas.getContext('2d', { alpha: false })
      if (!context) throw new Error('O navegador não conseguiu preparar a página para OCR.')
      await page.render({ canvasContext: context, viewport }).promise
      const blob = await new Promise((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error('Falha ao converter a página.')), 'image/jpeg', 0.9))
      images.push(new File([blob], `${file.name}-pagina-${pageNumber}.jpg`, { type: 'image/jpeg' }))
      page.cleanup?.()
    }
  } finally { await pdf.destroy?.() }
  return images
}

export function transactionFingerprint(transaction) {
  return [
    transaction.date,
    Number(transaction.amount || 0).toFixed(2),
    normalizeDescription(transaction.description),
    transaction.paymentMethod || '',
  ].join('|')
}

export function markPossibleDuplicates(imported, existing = []) {
  const batch = []
  return imported.map((item) => {
    const candidates = findDuplicateCandidates(item, existing, batch)
    batch.push(item)
    return {
      ...item,
      __possibleDuplicate: candidates.length > 0,
      __duplicateCandidates: candidates,
    }
  })
}

export function parseFinancialText(text, options = {}) {
  const referenceYear = options.referenceYear || new Date().getFullYear()
  const sourceFile = options.sourceFile || ''
  const dateAnchor = /(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?|\d{1,2}\s*(?:de\s*)?[a-zà-ÿç]{3,9})/gi
  const amountPattern = /[+−-]?\s*R?\$?\s?(?:\d{1,3}(?:\.\d{3})+|\d+),\d{2}/g

  const monthAnchors = scanMonthAnchors(text, referenceYear)
  const monthRows = []
  for (let anchorIndex = 0; anchorIndex < monthAnchors.length; anchorIndex += 1) {
    const anchor = monthAnchors[anchorIndex]
    const blockStart = anchor.index + anchor.text.length
    const blockEnd = anchorIndex + 1 < monthAnchors.length ? monthAnchors[anchorIndex + 1].index : text.length
    const block = text.slice(blockStart, blockEnd)
    const chunks = []

    if (block.includes('\n')) {
      let offset = 0
      for (const line of block.split('\n')) {
        const leading = line.length - line.trimStart().length
        if (line.trim()) chunks.push({ text: line.trim(), position: blockStart + offset + leading })
        offset += line.length + 1
      }
    } else {
      const localAmounts = [...block.matchAll(new RegExp(amountPattern.source, 'g'))]
      let cursor = 0
      for (const amountMatch of localAmounts) {
        const end = (amountMatch.index || 0) + amountMatch[0].length
        const rawChunk = block.slice(cursor, end)
        const leading = rawChunk.length - rawChunk.trimStart().length
        if (rawChunk.trim()) chunks.push({ text: rawChunk.trim(), position: blockStart + cursor + leading })
        cursor = end
      }
    }

    for (const candidate of chunks) {
      const dateResolution = resolveTransactionDate({
        lineText: candidate.text,
        position: candidate.position,
        monthAnchors,
        referenceYear,
      })
      if (dateResolution.rule !== 'month_heading' || !dateResolution.value || isInformationalChunk(candidate.text)) continue

      const amounts = candidate.text.match(new RegExp(amountPattern.source, 'g'))
      if (!amounts?.length || amounts.length > 3) continue
      const amountRaw = amounts[amounts.length - 1]
      const amount = normalizeAmount(amountRaw)
      if (!amount || amount > 100_000_000) continue

      const rawDescription = candidate.text.slice(0, 240)
      const dayRaw = candidate.text.match(/^\s*\d{1,2}/)?.[0] || ''
      const description = displayDescriptionFromRaw(candidate.text.replace(dayRaw, '').replace(amountRaw, ''))
      if (!description || description.length < 2 || isInformationalChunk(description)) continue

      monthRows.push(createFinancialRow({
        date: dateResolution.value,
        dateResolution,
        amount,
        rawDescription,
        description,
        sourceFile,
      }))
    }
  }

  // PicPay and similar account statements print one date heading followed by
  // several time-based rows. Parse those rows before the generic card format.
  const timedRows = []
  const dayPattern = /\b(\d{1,2})\s+de\s+([a-zà-ÿç]{3,9})\s+(?:de\s+)?(\d{4})\b/gi
  const dayAnchors = []
  let dayMatch
  while ((dayMatch = dayPattern.exec(text)) !== null) dayAnchors.push({ index: dayMatch.index, value: dayMatch[0] })

  for (let dayIndex = 0; dayIndex < dayAnchors.length; dayIndex += 1) {
    const day = dayAnchors[dayIndex]
    const end = dayIndex + 1 < dayAnchors.length ? dayAnchors[dayIndex + 1].index : text.length
    const block = text.slice(day.index, end).replace(/\s+/g, ' ').trim()
    if (!/saldo\s+ao\s+final\s+do\s+dia/i.test(block)) continue
    const date = normalizeDate(day.value, referenceYear)
    if (!date) continue

    const timePattern = /\b(?:[01]?\d|2[0-3]):[0-5]\d\b/g
    const timeAnchors = []
    let timeMatch
    while ((timeMatch = timePattern.exec(block)) !== null) timeAnchors.push({ index: timeMatch.index, value: timeMatch[0] })

    for (let timeIndex = 0; timeIndex < timeAnchors.length; timeIndex += 1) {
      const start = timeAnchors[timeIndex].index
      const rowEnd = timeIndex + 1 < timeAnchors.length ? timeAnchors[timeIndex + 1].index : block.length
      const chunk = block.slice(start, rowEnd).trim()
      const amounts = chunk.match(amountPattern)
      if (!amounts?.length) continue
      const amountRaw = amounts[amounts.length - 1]
      const amount = normalizeAmount(amountRaw)
      if (!amount || amount > 100_000_000) continue

      const description = displayDescriptionFromRaw(chunk
        .replace(timeAnchors[timeIndex].value, ' ')
        .replace(amountRaw, ' ')
        .replace(/\bcom\s+saldo\b/gi, ' '))
      if (!description || description.length < 2 || isInformationalChunk(description)) continue
      timedRows.push(createFinancialRow({ date, amount, rawDescription: chunk.slice(0, 240), description, sourceFile }))
    }
  }

  const anchors = []
  let match
  while ((match = dateAnchor.exec(text)) !== null) anchors.push({ index: match.index, value: match[0] })

  const rows = []
  for (let index = 0; index < anchors.length; index += 1) {
    const start = anchors[index].index
    const end = index + 1 < anchors.length ? anchors[index + 1].index : Math.min(text.length, start + 260)
    const dateRaw = anchors[index].value
    const chunk = text.slice(start, end).replace(/\s+/g, ' ').trim()
    if (isInformationalChunk(chunk)) continue

    const amounts = chunk.match(amountPattern)
    if (!amounts?.length || amounts.length > 3) continue

    const amountRaw = amounts[amounts.length - 1]
    const amount = normalizeAmount(amountRaw)
    const date = normalizeDate(dateRaw, referenceYear)
    if (!amount || !date || amount > 100_000_000) continue

    const rawDescription = chunk.slice(0, 240)
    const description = displayDescriptionFromRaw(chunk.replace(dateRaw, '').replace(amountRaw, ''))
    if (!description || description.length < 2 || isInformationalChunk(description)) continue

    rows.push(createFinancialRow({ date, amount, rawDescription, description, sourceFile }))
  }

  const seen = new Set()
  return [...timedRows, ...monthRows, ...rows].filter((item) => {
    const key = transactionFingerprint(item)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/** Leitura 100% local: nenhum PDF é enviado para serviços externos. */
export async function extractTransactionsFromPDFFree(file) {
  if (!file || (file.type !== 'application/pdf' && !file.name?.toLowerCase().endsWith('.pdf'))) throw new Error('Selecione um arquivo PDF válido.')
  if (file.size > 25 * 1024 * 1024) throw new Error(`${file.name}: o PDF ultrapassa 25 MB.`)
  try {
    const text = await extractRawText(file)
    return parseFinancialText(text, { sourceFile: file.name })
  } catch (error) {
    const message = String(error?.message || '')
    if (/password|encrypted/i.test(message)) {
      throw new Error(`${file.name}: este PDF é protegido por senha. Exporte uma cópia sem senha e tente novamente.`, { cause: error })
    }
    if (/invalid pdf|missing pdf|unexpected response|format error/i.test(message)) {
      throw new Error(`${file.name}: o arquivo não parece ser um PDF válido ou está corrompido.`, { cause: error })
    }
    if (/file.?reader|access.*dados|could not read|not readable|notreadable/i.test(message)) {
      throw new Error(`${file.name}: não foi possível ler este PDF no dispositivo. Se ele estiver no iCloud, baixe-o primeiro e selecione novamente.`, { cause: error })
    }
    if (/undefined is not a function|withResolvers|transferToFixedLength/i.test(message)) {
      throw new Error(`${file.name}: o leitor de PDF não iniciou corretamente. Feche esta aba, abra o UaiConta novamente e toque em Tentar novamente.`, { cause: error })
    }
    throw error
  }
}
