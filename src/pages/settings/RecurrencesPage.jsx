import React from 'react'
import SimpleCrudPage, { moneyText } from './SimpleCrudPage.jsx'

const today = new Date().toISOString().slice(0, 10)
const fields = [
  { key: 'description', label: 'Descrição', required: true, placeholder: 'Ex.: Faculdade' },
  { key: 'type', label: 'Tipo', type: 'select', required: true, defaultValue: 'despesa', options: [
    { value: 'despesa', label: 'Despesa' }, { value: 'receita', label: 'Receita' }, { value: 'investimento', label: 'Investimento' },
  ] },
  { key: 'amount_cents', label: 'Valor', money: true, required: true, placeholder: '0,00' },
  { key: 'category', label: 'Categoria', required: true, defaultValue: 'Não categorizado' },
  { key: 'payment_method', label: 'Pagamento', placeholder: 'Pix, cartão...' },
  { key: 'frequency', label: 'Frequência', type: 'select', required: true, defaultValue: 'mensal', options: ['semanal','quinzenal','mensal','anual'] },
  { key: 'start_date', label: 'Início', type: 'date', required: true, defaultValue: today },
  { key: 'end_date', label: 'Fim opcional', type: 'date' },
  { key: 'active', label: 'Ativa', type: 'checkbox', defaultValue: true },
]

export default function RecurrencesPage() {
  return <SimpleCrudPage title="Recorrências" eyebrow="Previsto x realizado" description="Regras futuras ficam planejadas até você confirmar a ocorrência como realizada." table="recurrence_rules" fields={fields} itemTitle={(row) => row.description || 'Recorrência'} itemSubtitle={(row) => `${moneyText(row.amount_cents)} · ${row.frequency} · ${row.active ? 'ativa' : 'pausada'}`} />
}
