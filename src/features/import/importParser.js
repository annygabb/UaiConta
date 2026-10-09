import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, PAYMENT_METHODS } from '../../constants.js'
import { extractTransactionsFromPDFFree } from '../../pdfParserFree.js'
import { recognizeImage, normalizeReceiptText } from '../receipts/ocr.ts'
import { uid } from '../../utils.js'
import { resolveTransactionDate } from './dateResolution.ts'
import { summarizeDraftConfidence } from './provenance.ts'
import { parseReceiptText } from './receiptTextParser.ts'

function searchable(value = '') {
  const source = String(value)
  const normalized = typeof source.normalize === 'function' ? source.normalize('NFKD') : source
  return normalized
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function readFileAsText(file) {
  if (typeof file?.text === 'function') return file.text()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error || new Error('Não foi possível ler o CSV no Safari.'))
    reader.onload = () => resolve(String(reader.result || ''))
    reader.readAsText(file, 'UTF-8')
  })
}

const EXPENSE_RULES = [
  ['Transporte', ['uber', '99 ', 'cabify', 'taxi', 'combustivel', 'gasolina', 'etanol', 'posto ', 'estacionamento', 'pedagio', 'passagem', 'onibus', 'metro ']],
  ['Faculdade', ['faculdade', 'universidade', 'mensalidade', 'matricula', 'material escolar', 'udemy', 'alura']],
  ['Psicóloga', ['psicolog', 'terapia', 'psicoterapia']],
  ['Personal', ['personal', 'academia', ' gym', 'treino', 'crossfit']],
  ['Supermercado', ['supermercado', 'mercado ', 'atacadao', 'carrefour', 'assai', 'pao de acucar', 'hortifruti']],
  ['Alimentação', ['ifood', 'restaurante', 'lanchonete', 'padaria', 'cafe ', 'pizza', 'hamburguer', 'lanche', 'delivery', 'mcdonald', 'burger king']],
  ['Saúde', ['farmacia', 'drogaria', 'consulta', 'clinica', 'hospital', 'medico', 'dentista', 'exame', 'laboratorio', 'remedio']],
  ['Diversão', ['cinema', 'show ', 'spotify', 'netflix', 'disney', 'prime video', 'hbo', 'streaming', 'jogo', 'game']],
  ['Lazer', ['viagem', 'hotel', 'pousada', 'praia', 'parque', 'passeio', 'airbnb']],
]

const INCOME_RULES = [
  ['Salário', ['salario', 'pagamento folha', 'holerite', 'ntt data']],
  ['Freelance', ['freela', 'freelance', 'servico']],
  ['Comissão', ['comissao']],
  ['Venda', ['venda', 'marketplace', 'enjoei', 'mercado livre']],
  ['Reembolso', ['reembolso', 'estorno', 'cashback']],
  ['Rendimento', ['rendimento', 'dividendo', 'juros', 'provento']],
]

export function suggestCategory(description = '', type = 'despesa') {
  const text = ` ${searchable(description)} `
  const rules = type === 'receita' ? INCOME_RULES : EXPENSE_RULES
  const found = rules.find(([, keywords]) => keywords.some((keyword) => text.includes(keyword)))
  return found?.[0] || (type === 'receita' ? 'Outras receitas' : 'Não categorizado')
}

export function suggestPaymentMethod(value = '') {
  const text = searchable(value)
  if (/\bpix\b/.test(text)) return 'Pix'
  if (text.includes('credito') || text.includes('credit')) return 'Cartão de crédito'
  if (text.includes('debito') || text.includes('debit')) return 'Cartão de débito'
  if (text.includes('boleto')) return 'Boleto'
  if (text.includes('dinheiro') || text.includes('cash')) return 'Dinheiro'
  if (text.includes('transferencia') || /\bted\b|\bdoc\b/.test(text)) return 'Transferência'
  return 'Não identificado'
}

function parseMoney(value) {
  const raw = String(value ?? '').trim().replace(/R\$/gi, '').replace(/\s/g, '')
  if (!raw) return 0
  const comma = raw.lastIndexOf(',')
  const dot = raw.lastIndexOf('.')
  let normalized = raw
  if (comma > dot) normalized = raw.replace(/\./g, '').replace(',', '.')
  else if (dot > comma && comma >= 0) normalized = raw.replace(/,/g, '')
  const number = Number(normalized.replace(/[^\d.-]/g, ''))
  return Number.isFinite(number) ? number : 0
}

function detectDelimiter(line) {
  return [';', ',', '\t']
    .map((delimiter) => [delimiter, line.split(delimiter).length])
    .sort((a, b) => b[1] - a[1])[0][0]
}

function parseCsvLine(line, delimiter) {
  const output = []
  let cell = ''
  let quoted = false
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    if (char === '"') {
      if (quoted && line[index + 1] === '"') { cell += '"'; index += 1 } else quoted = !quoted
    } else if (char === delimiter && !quoted) {
      output.push(cell)
      cell = ''
    } else cell += char
  }
  output.push(cell)
  return output.map((item) => item.trim())
}

function normalizeHeader(value = '') {
  return searchable(value).replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
}

function headerIndex(headers, options) {
  return headers.findIndex((header) => options.includes(header))
}

async function extractCsv(file) {
  let text
  try {
    text = await readFileAsText(file)
  } catch (error) {
    throw new Error(`${file?.name || 'CSV'}: não foi possível ler o arquivo no Safari. ${String(error?.message || '')}`.trim(), { cause: error })
  }
  const lines = text.split(/\r?\n/).filter((line) => line.trim())
  if (lines.length < 2) throw new Error('O CSV não possui linhas suficientes para importar.')

  const delimiter = detectDelimiter(lines[0])
  const headers = parseCsvLine(lines[0], delimiter).map(normalizeHeader)
  const dateIndex = headerIndex(headers, ['data', 'date', 'transaction_date', 'dt'])
  const descriptionIndex = headerIndex(headers, ['descricao', 'description', 'historico', 'estabelecimento', 'merchant', 'memo'])
  const amountIndex = headerIndex(headers, ['valor', 'amount', 'value', 'total'])
  const typeIndex = headerIndex(headers, ['tipo', 'type', 'natureza'])
  const categoryIndex = headerIndex(headers, ['categoria', 'category'])
  const paymentIndex = headerIndex(headers, ['forma_pagamento', 'payment_method', 'pagamento', 'payment'])
  if (descriptionIndex < 0 || amountIndex < 0) throw new Error('O CSV precisa ter ao menos colunas de descrição/histórico e valor.')

  return lines.slice(1).map((line, rowIndex) => {
    const cells = parseCsvLine(line, delimiter)
    const signed = parseMoney(cells[amountIndex])
    const rawType = typeIndex >= 0 ? searchable(cells[typeIndex]) : ''
    const description = cells[descriptionIndex] || `Linha ${rowIndex + 2}`
    const looksIncome = /receita|credito|entrada|income/.test(rawType) || (signed > 0 && /salario|reembolso|rendimento|freela|comissao/.test(searchable(description)))
    const type = looksIncome ? 'receita' : 'despesa'
    const suppliedCategory = categoryIndex >= 0 ? cells[categoryIndex] : ''
    const suppliedPayment = paymentIndex >= 0 ? cells[paymentIndex] : ''
    const paymentMethod = PAYMENT_METHODS.includes(suppliedPayment) ? suppliedPayment : suggestPaymentMethod(`${description} ${suppliedPayment}`)
    const receivedAt = Number(file.lastModified) > 0 ? new Date(file.lastModified).toISOString() : undefined
    const dateResolution = resolveTransactionDate({
      lineText: dateIndex >= 0 ? cells[dateIndex] : '',
      position: rowIndex + 1,
      referenceYear: receivedAt ? Number(receivedAt.slice(0, 4)) : new Date().getFullYear(),
      receivedAt,
      receivedSourceKind: 'upload_date',
    })
    const draft = {
      id: uid(),
      source: { kind: 'csv', fileName: file.name },
      rawText: line,
      fields: {
        type: { value: type, source: { kind: 'line_text', line: rowIndex + 2 }, confidence: rawType ? 'alta' : 'media', evidence: rawType || description },
        amountCents: { value: Math.round(Math.abs(signed) * 100), source: { kind: 'line_text', line: rowIndex + 2 }, confidence: 'alta', evidence: cells[amountIndex] },
        description: { value: description, source: { kind: 'line_text', line: rowIndex + 2 }, confidence: 'alta', evidence: description },
        date: dateResolution,
        category: { value: suppliedCategory || suggestCategory(description, type), source: { kind: suppliedCategory ? 'line_text' : 'system_suggestion', line: rowIndex + 2 }, confidence: suppliedCategory ? 'alta' : 'media', evidence: suppliedCategory || description },
        paymentMethod: { value: paymentMethod, source: { kind: suppliedPayment ? 'line_text' : 'system_suggestion', line: rowIndex + 2 }, confidence: paymentMethod === 'Não identificado' ? 'baixa' : suppliedPayment ? 'alta' : 'media', evidence: suppliedPayment || description },
      },
    }
    return draftToLegacyRow(draft)
  }).filter((row) => row.amount > 0)
}

function draftToLegacyRow(draft) {
  const summary = summarizeDraftConfidence(draft)
  const { fields } = draft
  return {
    id: draft.id,
    type: fields.type.value || 'despesa',
    amount: (fields.amountCents.value || 0) / 100,
    amountCents: fields.amountCents.value || 0,
    description: fields.description.value || 'Documento importado',
    rawDescription: draft.rawText || '',
    category: fields.category.value || 'Não categorizado',
    categorySuggested: fields.category.source.kind === 'system_suggestion',
    paymentMethod: fields.paymentMethod.value || 'Não identificado',
    date: fields.date.value || '',
    dateResolution: fields.date,
    fieldEvidence: fields,
    requiresReview: summary.requiresReview,
    source: draft.source.kind === 'image' ? 'imagem' : draft.source.kind,
    sourceFile: draft.source.fileName || '',
    confidence: summary.level,
    __imported: true,
  }
}

async function extractImage(file, onProgress) {
  const result = await recognizeImage(file, onProgress)
  const text = normalizeReceiptText(result.text)
  const receivedAt = Number(file.lastModified) > 0 ? new Date(file.lastModified).toISOString() : undefined
  return [draftToLegacyRow(parseReceiptText(text, {
    fileName: file.name,
    ocrConfidence: result.confidence,
    receivedAt,
    referenceYear: receivedAt ? Number(receivedAt.slice(0, 4)) : new Date().getFullYear(),
  }))]
}

function enrichRows(rows, file) {
  return rows.map((row) => {
    const type = row.type || 'despesa'
    const currentCategory = row.category || ''
    const shouldSuggest = !currentCategory || currentCategory === 'Não categorizado' || currentCategory === EXPENSE_CATEGORIES[0] || currentCategory === INCOME_CATEGORIES[0]
    return {
      ...row,
      id: row.id || uid(),
      sourceFile: row.sourceFile || file.name,
      category: shouldSuggest ? suggestCategory(`${row.description || ''} ${row.rawDescription || ''}`, type) : currentCategory,
      categorySuggested: shouldSuggest,
      paymentMethod: row.paymentMethod && row.paymentMethod !== 'Não identificado' ? row.paymentMethod : suggestPaymentMethod(`${row.description || ''} ${row.rawDescription || ''}`),
    }
  })
}

export async function extractTransactionsFromFile(file, onProgress) {
  const name = file?.name?.toLowerCase() || ''
  const type = file?.type || ''
  if (type === 'application/pdf' || name.endsWith('.pdf')) return enrichRows(await extractTransactionsFromPDFFree(file), file)
  if (type === 'text/csv' || type === 'application/csv' || name.endsWith('.csv')) return enrichRows(await extractCsv(file), file)
  if (type.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(name)) return enrichRows(await extractImage(file, onProgress), file)
  throw new Error('Formato não suportado. Use PDF, CSV, PNG, JPG, JPEG ou WEBP.')
}
