import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, PAYMENT_METHODS } from '../../constants.js'
import { extractTransactionsFromPDFFree } from '../../pdfParserFree.js'
import { recognizeImage, normalizeReceiptText } from '../receipts/ocr.ts'
import { uid } from '../../utils.js'

const CATEGORY_RULES = [
  ['Transporte', /\b(uber|99\b|cabify|taxi|táxi|combust[ií]vel|gasolina|etanol|posto|estacionamento|ped[aá]gio|passagem|ônibus|onibus|metro|metrô)\b/i],
  ['Faculdade', /\b(faculdade|universidade|mensalidade|curso|alura|udemy|livro|material escolar|matr[ií]cula)\b/i],
  ['Psicóloga', /\b(psic[oó]log|terapia|psicoterapia)\b/i],
  ['Personal', /\b(personal|academia|gym|treino|crossfit)\b/i],
  ['Supermercado', /\b(supermercado|mercado|atacad[aã]o|carrefour|assai|assa[ií]|p[aã]o de a[cç][uú]car|hortifruti)\b/i],
  ['Alimentação', /\b(ifood|restaurante|lanchonete|padaria|caf[eé]|pizza|hamb[uú]rguer|lanche|delivery|mcdonald|burger king)\b/i],
  ['Saúde', /\b(farm[aá]cia|drogaria|consulta|cl[ií]nica|hospital|m[eé]dico|dentista|exame|laborat[oó]rio|rem[eé]dio)\b/i],
  ['Diversão', /\b(cinema|show|spotify|netflix|disney|prime video|hbo|streaming|jogo|game)\b/i],
  ['Lazer', /\b(viagem|hotel|pousada|praia|parque|passeio|airbnb)\b/i],
]

const INCOME_RULES = [
  ['Salário', /\b(sal[aá]rio|pagamento folha|holerite|ntt data)\b/i],
  ['Freelance', /\b(freela|freelance|projeto|servi[cç]o)\b/i],
  ['Comissão', /\b(comiss[aã]o)\b/i],
  ['Venda', /\b(venda|marketplace|enjoei|mercado livre)\b/i],
  ['Reembolso', /\b(reembolso|estorno|cashback)\b/i],
  ['Rendimento', /\b(rendimento|dividendo|juros|provento)\b/i],
]

export function suggestCategory(description = '', type = 'despesa') {
  const text = String(description || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
  const rules = type === 'receita' ? INCOME_RULES : CATEGORY_RULES
  const found = rules.find(([, pattern]) => pattern.test(text))
  return found?.[0] || (type === 'receita' ? 'Outras receitas' : 'Não categorizado')
}

export function suggestPaymentMethod(text = '') {
  const value = String(text || '')
  if (/\bpix\b/i.test(value)) return 'Pix'
  if (/cr[eé]dito|credit/i.test(value)) return 'Cartão de crédito'
  if (/d[eé]bito|debit/i.test(value)) return 'Cartão de débito'
  if (/boleto/i.test(value)) return 'Boleto'
  if (/dinheiro|cash/i.test(value)) return 'Dinheiro'
  if (/transfer[eê]ncia|ted|doc\b/i.test(value)) return 'Transferência'
  return 'Não identificado'
}

function normalizeDate(value = '') {
  const clean = String(value || '').trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean
  const match = clean.match(/(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})/)
  if (!match) return new Date().toISOString().slice(0, 10)
  const year = match[3].length === 2 ? Number(`20${match[3]}`) : Number(match[3])
  return `${year}-${String(Number(match[2])).padStart(2, '0')}-${String(Number(match[1])).padStart(2, '0')}`
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
  const candidates = [';', ',', '\t']
  return candidates.map((delimiter) => [delimiter, line.split(delimiter).length]).sort((a, b) => b[1] - a[1])[0][0]
}

function parseCsvLine(line, delimiter) {
  const output = []
  let cell = ''
  let quoted = false
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    if (char === '"') {
      if (quoted && line[index + 1] === '"') { cell += '"'; index += 1 } else quoted = !quoted
    } else if (char === delimiter && !quoted) { output.push(cell); cell = '' } else cell += char
  }
  output.push(cell)
  return output.map((item) => item.trim())
}

function normalizeHeader(value = '') {
  return String(value).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
}

function headerIndex(headers, options) {
  return headers.findIndex((header) => options.includes(header))
}

async function extractCsv(file) {
  const text = await file.text()
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
    const rawType = typeIndex >= 0 ? String(cells[typeIndex] || '').toLowerCase() : ''
    const description = cells[descriptionIndex] || `Linha ${rowIndex + 2}`
    const looksIncome = /receita|credito|crédito|entrada|income/.test(rawType) || (signed > 0 && /sal[aá]rio|reembolso|rendimento|freela|comiss[aã]o/i.test(description))
    const type = looksIncome ? 'receita' : 'despesa'
    const amount = Math.abs(signed)
    const suppliedCategory = categoryIndex >= 0 ? cells[categoryIndex] : ''
    const category = suppliedCategory || suggestCategory(description, type)
    const suppliedPayment = paymentIndex >= 0 ? cells[paymentIndex] : ''
    const paymentMethod = PAYMENT_METHODS.includes(suppliedPayment) ? suppliedPayment : suggestPaymentMethod(`${description} ${suppliedPayment}`)
    return {
      id: uid(), type, amount, description, rawDescription: line, category,
      categorySuggested: !suppliedCategory,
      paymentMethod, date: dateIndex >= 0 ? normalizeDate(cells[dateIndex]) : new Date().toISOString().slice(0, 10),
      source: 'csv', sourceFile: file.name, confidence: suppliedCategory ? 'alta' : 'media', __imported: true,
    }
  }).filter((row) => row.amount > 0)
}

function firstLikelyMerchant(text) {
  return String(text || '').split(/\r?\n/).map((line) => line.trim()).find((line) => line.length >= 3 && line.length <= 60 && !/cnpj|cpf|cupom|nota fiscal|www\.|http/i.test(line)) || 'Documento importado'
}

function largestMoney(text) {
  const matches = String(text || '').match(/(?:R\$\s*)?\d{1,3}(?:\.\d{3})*,\d{2}|(?:R\$\s*)?\d+\.\d{2}/g) || []
  return matches.map(parseMoney).filter((value) => Number.isFinite(value) && value > 0).sort((a, b) => b - a)[0] || 0
}

function dateFromText(text) {
  const match = String(text || '').match(/\b\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}\b/)
  return match ? normalizeDate(match[0]) : new Date().toISOString().slice(0, 10)
}

async function extractImage(file, onProgress) {
  const result = await recognizeImage(file, onProgress)
  const text = normalizeReceiptText(result.text)
  const description = firstLikelyMerchant(text)
  const amount = largestMoney(text)
  const category = suggestCategory(`${description}\n${text}`, 'despesa')
  return [{
    id: uid(), type: 'despesa', amount, description, rawDescription: text, category,
    categorySuggested: true, paymentMethod: suggestPaymentMethod(text), date: dateFromText(text),
    source: 'imagem', sourceFile: file.name, confidence: Number(result.confidence || 0) >= 70 && amount > 0 ? 'media' : 'baixa', __imported: true,
  }]
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
