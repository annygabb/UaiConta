import React from 'react'
import SimpleCrudPage, { moneyText } from './SimpleCrudPage.jsx'

const fields = [
  { key: 'name', label: 'Nome do cartão', required: true, placeholder: 'Ex.: Nubank Platinum' },
  { key: 'bank', label: 'Banco/instituição', placeholder: 'Ex.: Nubank' },
  { key: 'credit_limit_cents', label: 'Limite', money: true, placeholder: '0,00' },
  { key: 'closing_day', label: 'Dia de fechamento', type: 'number', min: 1, max: 31 },
  { key: 'due_day', label: 'Dia de vencimento', type: 'number', min: 1, max: 31 },
]

export default function CardsPage() {
  return <SimpleCrudPage title="Cartões" eyebrow="Crédito" description="Organize limites, fechamento e vencimento para acompanhar faturas e parcelas futuras." table="credit_cards" fields={fields} itemSubtitle={(row) => `${row.bank || 'Sem instituição'} · limite ${moneyText(row.credit_limit_cents)} · vence dia ${row.due_day || '—'}`} />
}
