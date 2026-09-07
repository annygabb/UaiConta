import React from 'react'
import SimpleCrudPage, { moneyText } from './SimpleCrudPage.jsx'

const fields = [
  { key: 'name', label: 'Nome da meta', required: true, placeholder: 'Ex.: Reserva de emergência' },
  { key: 'target_amount_cents', label: 'Valor alvo', money: true, required: true, placeholder: '0,00' },
  { key: 'current_amount_cents', label: 'Valor atual', money: true, placeholder: '0,00' },
  { key: 'target_date', label: 'Prazo', type: 'date' },
]

export default function GoalsPage() {
  return <SimpleCrudPage title="Metas" eyebrow="Objetivos" description="Acompanhe reservas, compras e objetivos financeiros sem misturar meta com despesa realizada." table="goals" fields={fields} itemSubtitle={(row) => `${moneyText(row.current_amount_cents)} de ${moneyText(row.target_amount_cents)}${row.target_date ? ` · até ${row.target_date}` : ''}`} />
}
