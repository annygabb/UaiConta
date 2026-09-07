import React from 'react'
import SimpleCrudPage, { moneyText } from './SimpleCrudPage.jsx'

const fields = [
  { key: 'name', label: 'Nome da conta', required: true, placeholder: 'Ex.: Nubank' },
  { key: 'kind', label: 'Tipo', type: 'select', required: true, defaultValue: 'conta_corrente', options: [
    { value: 'conta_corrente', label: 'Conta corrente' }, { value: 'poupanca', label: 'Poupança' },
    { value: 'carteira', label: 'Carteira' }, { value: 'digital', label: 'Conta digital' },
    { value: 'investimentos', label: 'Investimentos' }, { value: 'outro', label: 'Outro' },
  ] },
  { key: 'institution', label: 'Instituição', placeholder: 'Ex.: Nubank' },
  { key: 'initial_balance_cents', label: 'Saldo inicial', money: true, placeholder: '0,00' },
]

export default function AccountsPage() {
  return <SimpleCrudPage title="Contas" eyebrow="Patrimônio" description="Cadastre onde seu dinheiro fica para preparar saldos e transferências entre contas." table="accounts" fields={fields} itemSubtitle={(row) => `${row.institution || 'Sem instituição'} · saldo inicial ${moneyText(row.initial_balance_cents)}`} />
}
