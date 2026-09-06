import React, { useEffect, useMemo, useState } from "react";
import { Copy, FileText, Pencil, Search, Trash2 } from "lucide-react";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, INVESTMENT_CATEGORIES, PAYMENT_METHODS } from "../constants.js";
import { filterTransactions } from "../finance.js";
import { dateLabel, money } from "../utils.js";
import { Badge, EmptyBlock, Panel } from "../components/Common.jsx";

const allCategories = Array.from(new Set([...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES, ...INVESTMENT_CATEGORIES]));

export default function TransactionsPage({ transactions, period, onEdit, onDuplicate, onDelete, onAdd }) {
  const [filters, setFilters] = useState({ search: "", type: "todos", category: "todas", payment: "todas", imported: "todos", period });
  useEffect(() => setFilters((current) => ({ ...current, period })), [period]);
  const rows = useMemo(() => filterTransactions(transactions, filters).sort((a,b)=>b.date.localeCompare(a.date)), [transactions, filters]);
  const total = rows.reduce((sum,item)=>sum+(item.type==="receita"?item.amount:item.type==="transferencia"?0:-item.amount),0);
  const patch = (key,value)=>setFilters((current)=>({...current,[key]:value}));

  return <div className="page-stack">
    <div className="page-intro"><div><span className="eyebrow">Histórico completo</span><h1>Movimentações</h1><p>Busque, filtre, edite ou duplique qualquer lançamento.</p></div><button className="primary-btn" onClick={onAdd}>Adicionar movimentação</button></div>
    <Panel className="filters-panel">
      <div className="filter-search"><Search size={16}/><input placeholder="Buscar descrição, categoria ou pagamento" value={filters.search} onChange={(e)=>patch("search",e.target.value)}/></div>
      <div className="filters-grid">
        <label><span>Período</span><input type="month" value={filters.period} onChange={(e)=>patch("period",e.target.value)}/></label>
        <label><span>Tipo</span><select value={filters.type} onChange={(e)=>patch("type",e.target.value)}><option value="todos">Todos</option><option value="receita">Receitas</option><option value="despesa">Despesas</option><option value="investimento">Investimentos</option><option value="transferencia">Transferências</option></select></label>
        <label><span>Categoria</span><select value={filters.category} onChange={(e)=>patch("category",e.target.value)}><option value="todas">Todas</option>{allCategories.map((item)=><option key={item}>{item}</option>)}</select></label>
        <label><span>Pagamento</span><select value={filters.payment} onChange={(e)=>patch("payment",e.target.value)}><option value="todas">Todos</option>{PAYMENT_METHODS.map((item)=><option key={item}>{item}</option>)}</select></label>
        <label><span>Origem</span><select value={filters.imported} onChange={(e)=>patch("imported",e.target.value)}><option value="todos">Todas</option><option value="sim">PDF</option><option value="nao">Manual</option></select></label>
        <button className="ghost-btn filter-clear" onClick={()=>setFilters({search:"",type:"todos",category:"todas",payment:"todas",imported:"todos",period})}>Limpar filtros</button>
      </div>
    </Panel>

    <Panel title={`${rows.length} movimentações`} subtitle={`Saldo líquido filtrado: ${money(total)}`}>
      {!rows.length ? <EmptyBlock title="Nenhuma movimentação encontrada" text="Tente mudar os filtros ou adicione um novo lançamento." action={onAdd}/> : <div className="transactions-table-wrap"><table className="transactions-table"><thead><tr><th>Data</th><th>Descrição</th><th>Tipo</th><th>Categoria</th><th>Pagamento</th><th>Valor</th><th></th></tr></thead><tbody>{rows.map((tx)=><tr key={tx.id}><td>{dateLabel(tx.date)}</td><td><strong>{tx.description}</strong>{tx.__imported&&<small><FileText size={12}/> {tx.sourceFile||"PDF"}</small>}</td><td><Badge tone={tx.type==="receita"?"success":tx.type==="despesa"?"danger":tx.type==="investimento"?"warning":"neutral"}>{tx.type}</Badge></td><td>{tx.category}</td><td>{tx.paymentMethod}</td><td><strong className={tx.type==="receita"?"positive-value":tx.type==="transferencia"?"neutral-value":"negative-value"}>{tx.type==="receita"?"+":tx.type==="transferencia"?"":"-"}{money(tx.amount)}</strong></td><td><div className="row-actions"><button onClick={()=>onEdit(tx)} aria-label="Editar"><Pencil size={15}/></button><button onClick={()=>onDuplicate(tx)} aria-label="Duplicar"><Copy size={15}/></button><button onClick={()=>onDelete(tx.id)} aria-label="Excluir"><Trash2 size={15}/></button></div></td></tr>)}</tbody></table>
      <div className="transaction-cards">{rows.map((tx)=><article key={tx.id}><button className="card-main" onClick={()=>onEdit(tx)}><div><strong>{tx.description}</strong><span>{dateLabel(tx.date)} · {tx.category}</span><small>{tx.paymentMethod}{tx.__imported?` · ${tx.sourceFile||"PDF"}`:""}</small></div><b className={tx.type==="receita"?"positive-value":"negative-value"}>{tx.type==="receita"?"+":"-"}{money(tx.amount)}</b></button><div className="card-actions"><button onClick={()=>onDuplicate(tx)}><Copy size={14}/> Duplicar</button><button onClick={()=>onDelete(tx.id)}><Trash2 size={14}/> Excluir</button></div></article>)}</div></div>}
    </Panel>
  </div>;
}
