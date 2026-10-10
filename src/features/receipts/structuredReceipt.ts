export interface StructuredReceiptItem {
  description: string
  quantity: number
  unitPriceCents: number | null
  totalPriceCents: number
  confidence: 'alta' | 'media' | 'baixa'
}

export interface StructuredReceipt {
  merchantName: string
  documentDate: string | null
  totalAmountCents: number
  discountCents: number
  paymentMethod: string
  items: StructuredReceiptItem[]
  warnings: string[]
}

function cents(value: string) {
  const normalized = value.replace(/R\$/gi, '').replace(/\s/g, '').replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(',', '.')
  const amount = Number(normalized.replace(/[^\d.-]/g, ''))
  return Number.isFinite(amount) ? Math.round(Math.abs(amount) * 100) : 0
}

function isoDate(text: string) {
  const match = text.match(/\b(\d{2})[\/.\-](\d{2})[\/.\-](\d{2,4})\b/)
  if (!match) return null
  const year = match[3].length === 2 ? `20${match[3]}` : match[3]
  return `${year}-${match[2]}-${match[1]}`
}

function paymentMethod(text: string) {
  if (/\bpix\b/i.test(text)) return 'Pix'
  if (/cr[eé]dito/i.test(text)) return 'Cartão de crédito'
  if (/d[eé]bito/i.test(text)) return 'Cartão de débito'
  if (/dinheiro|esp[eé]cie/i.test(text)) return 'Dinheiro'
  return 'Não identificado'
}

function merchant(lines: string[]) {
  return lines.find((line) => line.length >= 3 && line.length <= 80 && !/cnpj|cpf|nota fiscal|cupom|documento|extrato/i.test(line)) || 'Estabelecimento não identificado'
}

export function parseStructuredReceipt(rawText: string): StructuredReceipt {
  const lines = String(rawText || '').replace(/\r/g, '').split('\n').map((line) => line.replace(/\s+/g, ' ').trim()).filter(Boolean)
  const text = lines.join('\n')
  const totalLine = [...lines].reverse().find((line) => /(?:valor\s+)?total(?:\s+(?:r\$|a\s+pagar|da\s+compra))?/i.test(line) && /\d+[,.]\d{2}/.test(line))
  const discountLine = [...lines].reverse().find((line) => /desconto/i.test(line) && /\d+[,.]\d{2}/.test(line))
  const ignored = /subtotal|total|desconto|troco|pagamento|cnpj|cpf|data|hora|chave|tribut|economia/i
  const items: StructuredReceiptItem[] = []

  for (const line of lines) {
    if (ignored.test(line)) continue
    const money = line.match(/(?:R\$\s*)?(\d+(?:[.,]\d{3})*[.,]\d{2})\s*$/)
    if (!money) continue
    const prefix = line.slice(0, money.index).trim().replace(/^\d{1,4}\s+/, '')
    if (prefix.length < 2) continue
    const quantityMatch = prefix.match(/(?:^|\s)(\d+(?:[.,]\d{1,3})?)\s*[xX]\s*(?:R\$\s*)?(\d+[.,]\d{2})/)
    const quantity = quantityMatch ? Number(quantityMatch[1].replace(',', '.')) : 1
    items.push({
      description: prefix.replace(/\s+\d+(?:[.,]\d{1,3})?\s*[xX]\s*(?:R\$\s*)?\d+[.,]\d{2}.*/, '').trim() || prefix,
      quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
      unitPriceCents: quantityMatch ? cents(quantityMatch[2]) : null,
      totalPriceCents: cents(money[1]),
      confidence: quantityMatch ? 'alta' : 'media',
    })
  }

  const totalAmountCents = totalLine ? cents(totalLine.match(/\d+(?:[.,]\d{3})*[.,]\d{2}(?!.*\d)/)?.[0] || '') : items.reduce((sum, item) => sum + item.totalPriceCents, 0)
  const discountCents = discountLine ? cents(discountLine.match(/\d+(?:[.,]\d{3})*[.,]\d{2}(?!.*\d)/)?.[0] || '') : 0
  const itemTotal = items.reduce((sum, item) => sum + item.totalPriceCents, 0)
  const expected = Math.max(0, itemTotal - discountCents)
  const warnings: string[] = []
  if (!items.length) warnings.push('Nenhum item foi reconhecido. Revise a imagem ou preencha manualmente.')
  if (!totalAmountCents) warnings.push('O valor total não foi reconhecido.')
  if (items.length && totalAmountCents && Math.abs(expected - totalAmountCents) > 2) warnings.push('A soma dos itens não confere com o total. Revise itens, descontos e acréscimos.')

  return { merchantName: merchant(lines), documentDate: isoDate(text), totalAmountCents, discountCents, paymentMethod: paymentMethod(text), items, warnings }
}

export function reconcileReceipt(receipt: StructuredReceipt) {
  const itemsTotalCents = receipt.items.reduce((sum, item) => sum + item.totalPriceCents, 0)
  const differenceCents = receipt.totalAmountCents - Math.max(0, itemsTotalCents - receipt.discountCents)
  return { itemsTotalCents, differenceCents, balanced: Math.abs(differenceCents) <= 2 }
}
