import React from 'react'
import SimpleCrudPage, { moneyText } from './SimpleCrudPage.jsx'
import { recurrenceRepository } from '../../features/recurrences/recurrence.repository.ts'

const fields = [
  { key: 'name', label: 'Fonte de renda', required: true, placeholder: 'Ex.: Salário' },
  { key: 'expected_amount_cents', label: 'Valor esperado', money: true, required: true, placeholder: '0,00' },
  { key: 'frequency', label: 'Frequência', type: 'select', required: true, defaultValue: 'mensal', options: ['semanal','quinzenal','mensal','anual'] },
  { key: 'active', label: 'Ativa', type: 'checkbox', defaultValue: true },
]

async function createIncomeRecurrence(row) {
  if (!row?.active) return
  const description = String(row.name || 'Renda recorrente')
  await recurrenceRepository.createFromTransaction({
    type: 'receita',
    amountCents: Number(row.expected_amount_cents || 0),
    description,
    category: /sal[aá]rio/i.test(description) ? 'Salário' : 'Outras receitas',
    paymentMethod: 'Não identificado',
    frequency: row.frequency || 'mensal',
    date: new Date().toISOString().slice(0, 10),
  })
  window.dispatchEvent(new CustomEvent('uaiconta:data-changed', { detail: { table: 'recurrence_rules' } }))
}

export default function IncomeSourcesPage() {
  return <SimpleCrudPage
    title="Rendas"
    eyebrow="Entradas"
    description="Mantenha suas fontes fixas e variáveis editáveis. Fontes ativas com frequência definida entram automaticamente em Recorrências."
    table="income_sources"
    fields={fields}
    onCreated={createIncomeRecurrence}
    itemSubtitle={(row) => `${moneyText(row.expected_amount_cents)} · ${row.frequency || 'mensal'} · ${row.active ? 'ativa' : 'pausada'}`}
  />
}
