import { uid } from '../../utils.js'
import { resolveTransactionDate } from './dateResolution'
import type { ImportDraft, ImportSourceKind } from './import.types'

export interface ReceiptTextContext {
  fileName?: string
  ocrConfidence?: number
  referenceYear?: number
  receivedAt?: string
  sourceKind?: Extract<ImportSourceKind, 'image' | 'pdf' | 'whatsapp'>
}

function searchable(value: string): string {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function parseMoney(value: string): number {
  const raw = value.replace(/R\$/gi, '').replace(/\s/g, '')
  const comma = raw.lastIndexOf(',')
  const dot = raw.lastIndexOf('.')
  const normalized = comma > dot
    ? raw.replace(/\./g, '').replace(',', '.')
    : raw.replace(/,/g, '')
  const amount = Number(normalized.replace(/[^\d.-]/g, ''))
  return Number.isFinite(amount) ? Math.abs(amount) : 0
}

export function firstLikelyMerchant(text: string): string {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length >= 3 && line.length <= 60 && !/cnpj|cpf|cupom|nota fiscal|www\.|http/i.test(line))
    || 'Documento importado'
}

export function largestMoney(text: string): number {
  const matches = text.match(/(?:R\$\s*)?\d{1,3}(?:\.\d{3})*,\d{2}|(?:R\$\s*)?\d+\.\d{2}/g) || []
  return matches.map(parseMoney).sort((a, b) => b - a)[0] || 0
}

function categoryFromText(text: string): string {
  const value = searchable(text)
  if (/supermercado|mercado|atacadao|hortifruti/.test(value)) return 'Supermercado'
  if (/padaria|restaurante|lanchonete|cafe|pizza/.test(value)) return 'Alimentação'
  if (/farmacia|drogaria|hospital|clinica/.test(value)) return 'Saúde'
  if (/posto|combustivel|uber|taxi/.test(value)) return 'Transporte'
  return 'Não categorizado'
}

function paymentFromText(text: string): string {
  const value = searchable(text)
  if (/\bpix\b/.test(value)) return 'Pix'
  if (/cartao.*credito|credito/.test(value)) return 'Cartão de crédito'
  if (/cartao.*debito|debito/.test(value)) return 'Cartão de débito'
  if (/dinheiro|especie/.test(value)) return 'Dinheiro'
  if (/boleto/.test(value)) return 'Boleto'
  return 'Não identificado'
}

export function parseReceiptText(text: string, context: ReceiptTextContext = {}): ImportDraft {
  const normalizedText = String(text || '').replace(/\r/g, '').trim()
  const description = firstLikelyMerchant(normalizedText)
  const amountCents = Math.round(largestMoney(normalizedText) * 100)
  const referenceYear = context.referenceYear ?? new Date().getFullYear()
  const date = resolveTransactionDate({
    lineText: normalizedText,
    referenceYear,
    receivedAt: context.receivedAt,
    receivedSourceKind: 'upload_date',
  })
  const category = categoryFromText(`${description}\n${normalizedText}`)
  const paymentMethod = paymentFromText(normalizedText)
  const ocrConfidence = Number(context.ocrConfidence ?? 0)
  const textConfidence = ocrConfidence >= 70 ? 'alta' : 'baixa'

  return {
    id: uid(),
    source: { kind: context.sourceKind ?? 'image', fileName: context.fileName },
    rawText: normalizedText,
    fields: {
      type: {
        value: 'despesa',
        source: { kind: 'system_suggestion' },
        confidence: 'alta',
        evidence: 'Nota fiscal ou comprovante de compra',
      },
      amountCents: {
        value: amountCents || null,
        source: { kind: 'ocr' },
        confidence: amountCents > 0 ? textConfidence : 'baixa',
        evidence: normalizedText,
      },
      description: {
        value: description,
        source: { kind: 'ocr' },
        confidence: description !== 'Documento importado' ? textConfidence : 'baixa',
        evidence: description,
      },
      date,
      category: {
        value: category,
        source: { kind: 'system_suggestion' },
        confidence: category === 'Não categorizado' ? 'media' : 'alta',
        evidence: normalizedText,
      },
      paymentMethod: {
        value: paymentMethod,
        source: { kind: 'system_suggestion' },
        confidence: paymentMethod === 'Não identificado' ? 'baixa' : 'alta',
        evidence: normalizedText,
      },
    },
  }
}
