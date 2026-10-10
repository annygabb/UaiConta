import { describe, expect, it } from 'vitest'
import { parseReceiptText } from '../../src/features/import/receiptTextParser'
import { summarizeDraftConfidence } from '../../src/features/import/provenance'

describe('texto extraído de imagem ou nota', () => {
  it('extrai estabelecimento, total e data explícita em um rascunho canônico', () => {
    const draft = parseReceiptText(`
      SUPERMERCADO CENTRAL
      CNPJ 00.000.000/0001-00
      15/08/2026 18:42
      TOTAL R$ 125,90
      PAGAMENTO PIX
    `, { fileName: 'nota.jpg', ocrConfidence: 88, referenceYear: 2026 })

    expect(draft.fields.description.value).toBe('SUPERMERCADO CENTRAL')
    expect(draft.fields.amountCents.value).toBe(12590)
    expect(draft.fields.date).toMatchObject({
      value: '2026-08-15',
      rule: 'line_full_date',
      confidence: 'alta',
    })
    expect(draft.fields.paymentMethod.value).toBe('Pix')
    expect(summarizeDraftConfidence(draft).requiresReview).toBe(false)
  })

  it('registra a data do upload como baixa confiança quando a imagem não tem data', () => {
    const draft = parseReceiptText('PADARIA CENTRAL\nTOTAL R$ 18,50', {
      fileName: 'cupom.jpg',
      ocrConfidence: 82,
      referenceYear: 2026,
      receivedAt: '2026-10-03T09:30:00-03:00',
    })

    expect(draft.fields.date).toMatchObject({
      value: '2026-10-03',
      rule: 'received_at',
      source: { kind: 'upload_date' },
      confidence: 'baixa',
    })
    expect(summarizeDraftConfidence(draft)).toMatchObject({
      level: 'baixa',
      requiresReview: true,
    })
  })
})
