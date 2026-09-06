import React from 'react'
import SimpleCrudPage, { moneyText } from './SimpleCrudPage.jsx'

const fields = [
  { key: 'name', label: 'Fonte de renda', required: true, placeholder: 'Ex.: Salário' },
  { key: 'expected_amount_cents', label: 'Valor esperado', money: true, required: true, placeholder: '0,00' },
  { key: 'frequency', label: 'Frequência', type: 'select', required: true, defaultValue: 'mensal', options: ['semanal','quinzenal','mensal','anual'] },
  { key: 'active', label: 'Ativa', type: 'checkbox', defaultValue: true },
]

export default function IncomeSourcesPage() {
  return <SimpleCrudPage title="Rendas" eyebrow="Entradas" description="Mantenha suas fontes fixas e variáveis editáveis depois do onboarding." table="income_sources" fields={fields} itemSubtitle={(row) => `${moneyText(row.expected_amount_cents)} · ${row.frequency || 'mensal'} · ${row.active ? 'ativa' : 'pausada'}`} />
}
