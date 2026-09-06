import React from "react";
import { PiggyBank, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { Panel } from "../components/Common.jsx";
import { dateLabel, money } from "../utils.js";
import { C } from "../theme.js";

const config = {
  receitas: { title: "Receitas", icon: TrendingUp, type: "receita", accent: C.green, description: "Entradas registradas no período." },
  despesas: { title: "Gastos", icon: TrendingDown, type: "despesa", accent: C.red, description: "Despesas e categorias do período." },
  investimentos: { title: "Investimentos", icon: PiggyBank, type: "investimento", accent: C.lavender, description: "Aportes registrados no período." },
  economia: { title: "Economia", icon: Wallet, type: null, accent: C.pink, description: "Quanto restou depois de despesas e investimentos." },
};

export default function DetailPage({ kind, metrics, transactions, onEdit }) {
  const meta=config[kind]||config.receitas;
  const Icon=meta.icon;
  const rows=meta.type?transactions.filter((tx)=>tx.type===meta.type):transactions.filter((tx)=>["receita","despesa","investimento"].includes(tx.type));
  const value=kind==="receitas"?metrics.income:kind==="despesas"?metrics.expense:kind==="investimentos"?metrics.investments:Math.max(0,metrics.balance);
  return <div className="page-stack"><div className="detail-hero"><div className="detail-icon" style={{"--detail-accent":meta.accent}}><Icon size={23}/></div><div><span className="eyebrow">Detalhes do período</span><h1>{meta.title}</h1><p>{meta.description}</p></div><strong>{money(value)}</strong></div>
    <div className="analytics-summary"><div><span>Receita</span><strong>{money(metrics.income)}</strong></div><div><span>Gastos</span><strong>{money(metrics.expense)}</strong></div><div><span>Investimentos</span><strong>{money(metrics.investments)}</strong></div><div><span>Sobra</span><strong>{money(metrics.balance)}</strong></div></div>
    <Panel title="Lançamentos relacionados" subtitle={`${rows.length} itens no período`}><div className="detail-list">{rows.sort((a,b)=>b.date.localeCompare(a.date)).map((tx)=><button key={tx.id} onClick={()=>onEdit(tx)}><div><strong>{tx.description}</strong><span>{dateLabel(tx.date)} · {tx.category} · {tx.paymentMethod}</span></div><b className={tx.type==="receita"?"positive-value":"negative-value"}>{tx.type==="receita"?"+":"-"}{money(tx.amount)}</b></button>)}{!rows.length&&<p className="empty-text">Nenhum lançamento relacionado neste período.</p>}</div></Panel>
  </div>;
}
