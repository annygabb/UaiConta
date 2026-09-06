import React from 'react'
import SimpleCrudPage, { moneyText } from './SimpleCrudPage.jsx'

const fields = [
  { key: 'category', label: 'Categoria', required: true, placeholder: 'Ex.: Alimentação' },
  { key: 'period_month', label: 'Mês de referência', type: 'date', required: true },
  { key: 'amount_cents', label: 'Limite planejado', money: true, required: true, placeholder: '0,00' },
]

export default function BudgetsPage() {
  return <SimpleCrudPage title="Orçamentos" eyebrow="Planejamento" description="Defina quanto pretende gastar no geral ou por categoria e compare com o realizado." table="budgets" fields={fields} itemTitle={(row) => row.category || 'Orçamento'} itemSubtitle={(row) => `${moneyText(row.amount_cents)} · ${row.period_month || ''}`} />
}
