import { describe, expect, it } from 'vitest'
import { interpret, reply } from '../../supabase/functions/whatsapp-webhook/interpret'

describe('interpretação financeira do WhatsApp', () => {
  it('propõe despesa Pix sem salvar automaticamente', () => {
    const draft = interpret('Paguei um Pix de R$ 35,90 no supermercado em 08/10/2026', new Date('2026-10-10T12:00:00Z'))
    expect(draft).toMatchObject({ type: 'despesa', amount_cents: 3590, transaction_date: '2026-10-08', category: 'Supermercado', payment_method: 'Pix' })
    expect(reply(draft)).toContain('1 Confirmar')
  })

  it('reconhece receita e corrige somente o campo informado', () => {
    const draft = interpret('Recebi 150,00 de cliente')
    const correction = interpret('valor: 175,50', new Date(`${draft.transaction_date}T12:00:00Z`))
    expect(draft.type).toBe('receita')
    expect(correction.amount_cents).toBe(17550)
    expect(correction.transaction_date).toBe(draft.transaction_date)
  })
})
