import React from 'react'
import { IconPigMoney, IconTrendingDown, IconTrendingUp, IconWallet } from '@tabler/icons-react'
import { Panel } from '../components/Common.jsx'
import { dateLabel, money } from '../utils.js'
import { C } from '../theme.js'

const config = {
  receitas: { title: 'Receitas', icon: IconTrendingUp, type: 'receita', accent: C.green, description: 'Entradas realizadas e previstas no período.' },
  despesas: { title: 'Gastos', icon: IconTrendingDown, type: 'despesa', accent: C.red, description: 'Despesas realizadas e previstas no período.' },
  investimentos: { title: 'Investimentos', icon: IconPigMoney, type: 'investimento', accent: C.lavender, description: 'Aportes realizados e previstos no período.' },
  economia: { title: 'Economia', icon: IconWallet, type: null, accent: C.pink, description: 'Sobra prevista depois de gastos e investimentos.' },
}

export default function DetailPage({ kind, metrics, transactions, onEdit }) {
  const meta = config[kind] || config.receitas
  const Icon = meta.icon
  const rows = meta.type ? transactions.filter((tx) => tx.type === meta.type) : transactions.filter((tx) => ['receita','despesa','investimento'].includes(tx.type))
  const value = kind === 'receitas' ? metrics.income : kind === 'despesas' ? metrics.expense : kind === 'investimentos' ? metrics.investments : metrics.forecastBalance
  return <div className="page-stack">
    <div className="detail-hero">
      <div className="detail-icon" style={{ '--detail-accent': meta.accent }}><Icon size={24} stroke={1.7}/></div>
      <div><h1>{meta.title}</h1><p>{meta.description}</p></div><strong>{money(value)}</strong>
    </div>
    <div className="analytics-summary">
      <div><span>Receita prevista</span><strong>{money(metrics.income)}</strong></div>
      <div><span>Gastos previstos</span><strong>{money(metrics.expense)}</strong></div>
      <div><span>Investimentos previstos</span><strong>{money(metrics.investments)}</strong></div>
      <div><span>Sobra prevista</span><strong>{money(metrics.forecastBalance)}</strong></div>
    </div>
    <Panel title="Lançamentos relacionados" subtitle={`${rows.length} itens no período`}>
      <div className="detail-list">{rows.sort((a,b)=>b.date.localeCompare(a.date)).map((tx)=>{
        const planned = tx.status === 'planned' || String(tx.id).startsWith('planned:')
        return <button key={tx.id} onClick={()=>!planned && onEdit(tx)} disabled={planned} title={planned ? 'Ocorrência prevista pela recorrência' : 'Editar movimentação'}>
          <div><strong>{tx.description}</strong><span>{dateLabel(tx.date)} · {tx.category} · {tx.paymentMethod || 'Forma não informada'} · {planned ? 'Previsto' : 'Realizado'}</span></div>
          <b className={tx.type==='receita'?'positive-value':'negative-value'}>{tx.type==='receita'?'+':'-'}{money(tx.amount)}</b>
        </button>
      })}{!rows.length&&<p className="empty-text">Nenhum lançamento relacionado neste período.</p>}</div>
    </Panel>
  </div>
}
