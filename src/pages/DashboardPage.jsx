import React from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PiggyBank, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { CATEGORY_COLORS, C } from "../theme.js";
import { money } from "../utils.js";
import { navigate } from "../router.js";
import { ROUTES } from "../constants.js";
import { MetricCard, Panel, SpatialOrb } from "../components/Common.jsx";

const tooltipStyle = { background: C.surface2, border: `1px solid ${C.divider}`, borderRadius: 14, color: C.text, fontSize: 12 };

export default function DashboardPage({ metrics, monthlySeries, recentTransactions, onEdit, onAdd }) {
  const totalForPie = metrics.expense || 1;
  return (
    <>
      <section className="hero-grid">
        <div className="hero-copy">
          <span className="eyebrow">Visão financeira do período</span>
          <h1>Veja o que entrou, saiu e quanto ainda pode sobrar.</h1>
          <p>Todos os gráficos e indicadores abaixo usam o mesmo mês selecionado.</p>
          <div className="hero-inline-stats"><span><strong>{metrics.committedRate.toFixed(0)}%</strong> da renda comprometida</span><span><strong>{money(metrics.dailyAverage)}</strong> gasto médio diário</span></div>
        </div>
        <SpatialOrb value={metrics.projectedBalance} />
      </section>

      <div className="metric-grid">
        <MetricCard label="Receita do mês" value={metrics.income} delta={metrics.incomeDelta} icon={TrendingUp} accent={C.green} onClick={() => navigate(ROUTES.income)} />
        <MetricCard label="Gastos" value={metrics.expense} delta={metrics.expenseDelta} icon={TrendingDown} accent={C.red} onClick={() => navigate(ROUTES.expenses)} />
        <MetricCard label="Investimentos" value={metrics.investments} delta={metrics.investmentDelta} icon={PiggyBank} accent={C.lavender} onClick={() => navigate(ROUTES.investments)} />
        <MetricCard label="Economia" value={Math.max(0, metrics.balance)} delta={metrics.balanceDelta} icon={Wallet} accent={C.pink} onClick={() => navigate(ROUTES.savings)} />
      </div>

      <div className="dashboard-grid dashboard-grid-main">
        <Panel title="Receitas x despesas" subtitle="Evolução dos últimos 6 meses" className="span-2">
          <div className="chart-large"><ResponsiveContainer><AreaChart data={monthlySeries}>
            <defs><linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={C.lavender} stopOpacity=".45"/><stop offset="1" stopColor={C.lavender} stopOpacity="0"/></linearGradient><linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={C.purple} stopOpacity=".45"/><stop offset="1" stopColor={C.purple} stopOpacity="0"/></linearGradient></defs>
            <CartesianGrid stroke={C.divider} vertical={false}/><XAxis dataKey="label" tick={{ fill:C.textSoft,fontSize:11 }} axisLine={false} tickLine={false}/><YAxis tick={{ fill:C.textSoft,fontSize:11 }} axisLine={false} tickLine={false} width={48}/><Tooltip contentStyle={tooltipStyle} formatter={(v,n)=>[money(v),n]}/><Area type="monotone" dataKey="receitas" stroke={C.lavender} fill="url(#incomeFill)" strokeWidth={2}/><Area type="monotone" dataKey="despesas" stroke={C.purple} fill="url(#expenseFill)" strokeWidth={2}/></AreaChart></ResponsiveContainer></div>
        </Panel>

        <Panel title="Gastos por categoria" subtitle="Percentual do total de despesas">
          {metrics.categoryData.length ? <><div className="chart-donut"><ResponsiveContainer><PieChart><Pie data={metrics.categoryData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={76} paddingAngle={2}>{metrics.categoryData.map((entry,i)=><Cell key={entry.name} fill={CATEGORY_COLORS[i%CATEGORY_COLORS.length]} stroke="none"/>)}</Pie><Tooltip contentStyle={tooltipStyle} formatter={(v,n)=>[`${money(v)} · ${((v/totalForPie)*100).toFixed(1)}%`,n]}/></PieChart></ResponsiveContainer><div className="donut-center"><span>Total</span><strong>{money(metrics.expense)}</strong></div></div><div className="legend-list">{metrics.categoryData.slice(0,6).map((item,i)=><button key={item.name} onClick={()=>navigate(ROUTES.expenses)}><span className="legend-dot" style={{background:CATEGORY_COLORS[i%CATEGORY_COLORS.length]}}/><span>{item.name}</span><strong>{item.percentage.toFixed(0)}%</strong></button>)}</div></> : <p className="empty-text">Sem despesas neste período.</p>}
        </Panel>
      </div>

      <div className="dashboard-grid dashboard-grid-secondary">
        <Panel title="Receita, gastos e sobra" subtitle="Comparação direta do mês">
          <div className="chart-medium"><ResponsiveContainer><BarChart data={[{name:"Período",Receitas:metrics.income,Gastos:metrics.expense,Investimentos:metrics.investments,Sobra:Math.max(0,metrics.balance)}]}><CartesianGrid stroke={C.divider} vertical={false}/><XAxis dataKey="name" hide/><YAxis tick={{fill:C.textSoft,fontSize:10}} axisLine={false} tickLine={false}/><Tooltip contentStyle={tooltipStyle} formatter={(v,n)=>[money(v),n]}/><Legend wrapperStyle={{fontSize:11}}/><Bar dataKey="Receitas" fill={C.lavender} radius={[6,6,0,0]}/><Bar dataKey="Gastos" fill={C.purple} radius={[6,6,0,0]}/><Bar dataKey="Investimentos" fill={C.pink} radius={[6,6,0,0]}/><Bar dataKey="Sobra" fill={C.green} radius={[6,6,0,0]}/></BarChart></ResponsiveContainer></div>
        </Panel>

        <Panel title="Pix x cartão" subtitle="Quanto você gastou em cada período" className="span-2">
          <div className="chart-medium"><ResponsiveContainer><BarChart data={monthlySeries}><CartesianGrid stroke={C.divider} vertical={false}/><XAxis dataKey="label" tick={{fill:C.textSoft,fontSize:11}} axisLine={false} tickLine={false}/><YAxis tick={{fill:C.textSoft,fontSize:10}} axisLine={false} tickLine={false}/><Tooltip contentStyle={tooltipStyle} formatter={(v,n)=>[money(v),n==="pix"?"Pix":"Cartão"]}/><Legend wrapperStyle={{fontSize:11}} formatter={(v)=>v==="pix"?"Pix":"Cartão"}/><Bar dataKey="pix" fill={C.lavender} radius={[5,5,0,0]}/><Bar dataKey="cartao" fill={C.purple} radius={[5,5,0,0]}/></BarChart></ResponsiveContainer></div>
        </Panel>
      </div>

      <div className="dashboard-grid dashboard-grid-secondary">
        <Panel title="Insights" subtitle="Leitura automática dos seus dados" className="span-2"><div className="insight-list">{metrics.insights.slice(0,5).map((item,i)=><div key={i}><span>{String(i+1).padStart(2,"0")}</span><p>{item}</p></div>)}</div></Panel>
        <Panel title="Últimas movimentações" subtitle="Toque para editar"><div className="mini-transactions">{recentTransactions.slice(0,5).map((tx)=><button key={tx.id} onClick={()=>onEdit(tx)}><div><strong>{tx.description}</strong><span>{tx.category} · {tx.paymentMethod}</span></div><b className={tx.type==="receita"?"positive":""}>{tx.type==="receita"?"+":"-"}{money(tx.amount)}</b></button>)}{!recentTransactions.length&&<div className="empty-text"><p>Nenhuma movimentação ainda.</p><button className="primary-btn" onClick={onAdd}>Adicionar</button></div>}</div></Panel>
      </div>
    </>
  );
}
