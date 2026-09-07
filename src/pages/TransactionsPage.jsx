import React, { useEffect, useMemo, useState } from 'react'
import { IconCheck, IconCopy, IconFileInvoice, IconPencil, IconPlayerSkipForward, IconSearch, IconTrash } from '@tabler/icons-react'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, INVESTMENT_CATEGORIES, PAYMENT_METHODS } from '../constants.js'
import { filterTransactions } from '../finance.js'
import { dateLabel, money } from '../utils.js'
import { Badge, EmptyBlock, Panel, PeriodSelector } from '../components/Common.jsx'
import SelectField from '../components/ui/SelectField.jsx'

const allCategories = Array.from(new Set([...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES, ...INVESTMENT_CATEGORIES]))
const TYPE_OPTIONS = [
  { value: 'todos', label: 'Todos' }, { value: 'receita', label: 'Receitas' }, { value: 'despesa', label: 'Despesas' },
  { value: 'investimento', label: 'Investimentos' }, { value: 'transferencia', label: 'Transferências' },
]
const STATUS_OPTIONS = [
  { value: 'todos', label: 'Todos os status' }, { value: 'completed', label: 'Realizados' }, { value: 'planned', label: 'Previstos' }, { value: 'cancelled', label: 'Cancelados' },
]

const isVirtual = (tx) => String(tx.id || '').startsWith('planned:')

export default function TransactionsPage({ transactions, period, onEdit, onDuplicate, onDelete, onResolvePlanned, onAdd }) {
  const [filters, setFilters] = useState({ search: '', type: 'todos', status: 'todos', category: 'todas', payment: 'todas', imported: 'todos', period })
  useEffect(() => setFilters((current) => ({ ...current, period })), [period])
  const rows = useMemo(() => filterTransactions(transactions, filters).sort((a,b)=>b.date.localeCompare(a.date)), [transactions, filters])
  const total = rows.reduce((sum,item)=>sum+(item.type==='receita'?item.amount:item.type==='transferencia'?0:-item.amount),0)
  const patch = (key,value)=>setFilters((current)=>({...current,[key]:value}))

  const renderStatus = (tx) => tx.status === 'planned' ? <Badge tone="warning">previsto</Badge> : tx.status === 'cancelled' ? <Badge tone="neutral">cancelado</Badge> : <Badge tone="success">realizado</Badge>

  return <div className="page-stack transactions-page-v6">
    <div className="page-intro"><div><span className="eyebrow">Histórico completo</span><h1>Movimentações</h1><p>Realizado e previsto no mesmo lugar, sem confundir projeção com pagamento concluído.</p></div><button className="primary-btn" onClick={onAdd}>Adicionar movimentação</button></div>
    <Panel className="filters-panel filters-panel-v6">
      <div className="filter-search"><IconSearch size={16}/><input placeholder="Buscar descrição, categoria ou pagamento" value={filters.search} onChange={(e)=>patch('search',e.target.value)}/></div>
      <div className="filters-grid filters-grid-v6">
        <div className="filter-field"><span>Período</span><PeriodSelector compact value={filters.period} onChange={(value)=>patch('period',value)}/></div>
        <label><span>Tipo</span><SelectField value={filters.type} onChange={(value)=>patch('type',value)} options={TYPE_OPTIONS} ariaLabel="Filtrar por tipo"/></label>
        <label><span>Status</span><SelectField value={filters.status} onChange={(value)=>patch('status',value)} options={STATUS_OPTIONS} ariaLabel="Filtrar por status"/></label>
        <label><span>Categoria</span><SelectField value={filters.category} onChange={(value)=>patch('category',value)} options={[{value:'todas',label:'Todas'},...allCategories.map((value)=>({value,label:value}))]} ariaLabel="Filtrar por categoria"/></label>
        <label><span>Pagamento</span><SelectField value={filters.payment} onChange={(value)=>patch('payment',value)} options={[{value:'todas',label:'Todos'},...PAYMENT_METHODS.map((value)=>({value,label:value}))]} ariaLabel="Filtrar por pagamento"/></label>
        <label><span>Origem</span><SelectField value={filters.imported} onChange={(value)=>patch('imported',value)} options={[{value:'todos',label:'Todas'},{value:'sim',label:'Importado'},{value:'nao',label:'Manual/recorrência'}]} ariaLabel="Filtrar por origem"/></label>
        <button className="ghost-btn filter-clear" onClick={()=>setFilters({search:'',type:'todos',status:'todos',category:'todas',payment:'todas',imported:'todos',period})}>Limpar filtros</button>
      </div>
    </Panel>

    <Panel title={`${rows.length} movimentações`} subtitle={`Saldo líquido filtrado: ${money(total)}`}>
      {!rows.length ? <EmptyBlock title="Nenhuma movimentação encontrada" text="Tente mudar os filtros ou adicione um novo lançamento." action={onAdd}/> : <div className="transactions-table-wrap"><table className="transactions-table"><thead><tr><th>Data</th><th>Descrição</th><th>Tipo</th><th>Status</th><th>Categoria</th><th>Pagamento</th><th>Valor</th><th></th></tr></thead><tbody>{rows.map((tx)=><tr key={tx.id}><td>{dateLabel(tx.date)}</td><td><strong title={tx.rawDescription || tx.description}>{tx.description}</strong>{tx.__imported&&<small><IconFileInvoice size={12}/> {tx.sourceFile||'Arquivo importado'}</small>}{isVirtual(tx)&&<small>Gerado pela recorrência · não realizado</small>}</td><td><Badge tone={tx.type==='receita'?'success':tx.type==='despesa'?'danger':tx.type==='investimento'?'warning':'neutral'}>{tx.type}</Badge></td><td>{renderStatus(tx)}</td><td>{tx.category}</td><td>{tx.paymentMethod}</td><td><strong className={tx.type==='receita'?'positive-value':tx.type==='transferencia'?'neutral-value':'negative-value'}>{tx.type==='receita'?'+':tx.type==='transferencia'?'':'-'}{money(tx.amount)}</strong></td><td><div className="row-actions">{!isVirtual(tx)?<><button onClick={()=>onEdit(tx)} aria-label="Editar"><IconPencil size={16}/></button><button onClick={()=>onDuplicate(tx)} aria-label="Duplicar"><IconCopy size={16}/></button><button onClick={()=>onDelete(tx.id)} aria-label="Excluir"><IconTrash size={16}/></button></>:<><button onClick={()=>onResolvePlanned?.(tx,'completed')} aria-label="Confirmar como realizada" title="Confirmar como realizada"><IconCheck size={16}/></button><button onClick={()=>onResolvePlanned?.(tx,'cancelled')} aria-label="Pular esta ocorrência" title="Pular esta ocorrência"><IconPlayerSkipForward size={16}/></button></>}</div></td></tr>)}</tbody></table>
      <div className="transaction-cards">{rows.map((tx)=><article key={tx.id}><button className="card-main" onClick={()=>!isVirtual(tx)&&onEdit(tx)}><div><strong title={tx.description}>{tx.description}</strong><span>{dateLabel(tx.date)} · {tx.category}</span><small>{tx.paymentMethod}{tx.__imported?` · ${tx.sourceFile||'Importado'}`:''} · {tx.status==='planned'?'Previsto':'Realizado'}</small></div><b className={tx.type==='receita'?'positive-value':tx.type==='transferencia'?'neutral-value':'negative-value'}>{tx.type==='receita'?'+':tx.type==='transferencia'?'':'-'}{money(tx.amount)}</b></button>{!isVirtual(tx)?<div className="card-actions"><button onClick={()=>onDuplicate(tx)}><IconCopy size={14}/> Duplicar</button><button onClick={()=>onDelete(tx.id)}><IconTrash size={14}/> Excluir</button></div>:<div className="card-actions"><button onClick={()=>onResolvePlanned?.(tx,'completed')}><IconCheck size={14}/> Realizada</button><button onClick={()=>onResolvePlanned?.(tx,'cancelled')}><IconPlayerSkipForward size={14}/> Pular</button></div>}</article>)}</div></div>}
    </Panel>
  </div>
}
