import { describe, expect, it } from 'vitest'
import { parseStructuredReceipt, reconcileReceipt } from '../../src/features/receipts/structuredReceipt'

describe('nota fiscal estruturada', () => {
  it('extrai estabelecimento, data, itens, total e pagamento', () => {
    const parsed = parseStructuredReceipt(`SUPERMERCADO CENTRAL\nCNPJ 00.000.000/0001-00\nARROZ TIPO 1 25,90\nLEITE INTEGRAL 2 x 4,50 9,00\nTOTAL R$ 34,90\nPIX\n10/09/2026`)
    expect(parsed.merchantName).toBe('SUPERMERCADO CENTRAL')
    expect(parsed.documentDate).toBe('2026-09-10')
    expect(parsed.items).toHaveLength(2)
    expect(parsed.items[1]).toMatchObject({ quantity: 2, unitPriceCents: 450, totalPriceCents: 900 })
    expect(parsed.totalAmountCents).toBe(3490)
    expect(parsed.paymentMethod).toBe('Pix')
    expect(reconcileReceipt(parsed).balanced).toBe(true)
  })

  it('sinaliza divergência sem inventar ajuste', () => {
    const parsed = parseStructuredReceipt('LOJA TESTE\nPRODUTO A 10,00\nTOTAL 12,00')
    expect(reconcileReceipt(parsed)).toMatchObject({ differenceCents: 200, balanced: false })
    expect(parsed.warnings[0]).toMatch(/não confere/i)
  })
})
