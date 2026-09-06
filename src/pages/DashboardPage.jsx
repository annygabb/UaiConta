import React from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { IconPigMoney, IconTrendingDown, IconTrendingUp, IconWallet } from '@tabler/icons-react'
import { useNavigate } from 'react-router-dom'
import { CATEGORY_COLORS, C } from '../theme.js'
import { money } from '../utils.js'
import { ROUTES } from '../constants.js'
import { MetricCard, Panel, SpatialOrb } from '../components/Common.jsx'

const tooltipStyle = { background: C.surface2, border: `1px solid ${C.divider}`, borderRadius: 14, color: C.text, fontSize: 12, boxShadow: '0 18px 55px rgba(0,0,0,.35)' }
const chartCursor = { fill: 'rgba(123,51,126,.08)' }

function FinancialFlow({ metrics }) {
  const values = [metrics.income, metrics.expense, metrics.investments, Math.abs(metrics.forecastBalance)]
  const max = Math.max(1, ...values)
  const items = [
    { key: 'income', label: 'Receita', value: metrics.income, tone: 'positive', sign: '+' },
    { key: 'expense', label: 'Gastos', value: metrics.expense, tone: 'expense', sign: '−' },
    { key: 'investments', label: 'Investimentos', value: metrics.investments, tone: 'investment', sign: '−' },
    { key: 'balance', label: 'Sobra prevista', value: metrics.forecastBalance, tone: metrics.forecastBalance >= 0 ? 'positive' : 'negative', sign: '=' },
  ]
  return <div className="financial-flow" aria-label="Fluxo financeiro do período">
    {items.map((item, index) => {
      const width = Math.max(8, (Math.abs(item.value) / max) * 100)
      const share = metrics.income > 0 && item.key !== 'income' ? (Math.abs(item.value) / metrics.income) * 100 : 100
      return <div className={`flow-row flow-${item.tone}`} key={item.key}>
        <span className="flow-sign" aria-hidden="true">{item.sign}</span>
        <div className="flow-main">
          <div className="flow-label"><span>{item.label}</span><strong>{money(item.value)}</strong></div>
          <div className="flow-track"><span style={{ width: `${width}%` }} /></div>
          <small>{item.key === 'income' ? 'Base de receita realizada + prevista' : `${share.toFixed(0)}% da receita do período`}</small>
        </div>
        {index < items.length - 1 && <span className="flow-connector" aria-hidden="true" />}
      </div>
    })}
  </div>
}

export default function DashboardPage({ metrics, monthlySeries, recentTransactions, onEdit, onAdd }) {
  const navigate = useNavigate()
  const totalForPie = metrics.expense || 1
  const onlyUncategorized = metrics.categoryData.length === 1 && metrics.categoryData[0]?.name === 'Não categorizado'

  return (
    <>
      <section className="hero-grid">
        <div className="hero-copy">
          <h1>Seu mês, sem precisar refazer as contas.</h1>
          <p>Receitas, gastos, aportes e previsões usam o mesmo período. Valores futuros recorrentes aparecem como previstos até você confirmar que aconteceram.</p>
          <div className="hero-inline-stats">
            <span><strong>{metrics.committedRate.toFixed(0)}%</strong> da renda comprometida</span>
            <span><strong>{money(metrics.dailyAverage)}</strong> gasto médio diário realizado</span>
            <span><strong>{money(metrics.realizedBalance)}</strong> sobra realizada</span>
          </div>
        </div>
        <SpatialOrb realized={metrics.realizedBalance} forecast={metrics.projectedBalance} income={metrics.income} committedRate={metrics.committedRate} />
      </section>

      <div className="metric-grid">
        <MetricCard label="Receita do mês" value={metrics.income} delta={metrics.incomeDelta} icon={IconTrendingUp} accent={C.green} onClick={() => navigate(ROUTES.income)} />
        <MetricCard label="Gastos" value={metrics.expense} delta={metrics.expenseDelta} icon={IconTrendingDown} accent={C.red} onClick={() => navigate(ROUTES.expenses)} />
        <MetricCard label="Investimentos" value={metrics.investments} delta={metrics.investmentDelta} icon={IconPigMoney} accent={C.lavender} onClick={() => navigate(ROUTES.investments)} />
        <MetricCard label="Economia" value={metrics.forecastBalance} delta={metrics.balanceDelta} icon={IconWallet} accent={C.pink} onClick={() => navigate(ROUTES.savings)} />
      </div>

      <div className="dashboard-grid dashboard-grid-main">
        <Panel title="Receitas x despesas" subtitle="Realizado + previsto nos últimos 6 meses" className="span-2">
          <div className="chart-large"><ResponsiveContainer><AreaChart data={monthlySeries}>
            <defs><linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={C.lavender} stopOpacity=".45"/><stop offset="1" stopColor={C.lavender} stopOpacity="0"/></linearGradient><linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={C.purple} stopOpacity=".45"/><stop offset="1" stopColor={C.purple} stopOpacity="0"/></linearGradient></defs>
            <CartesianGrid stroke={C.divider} vertical={false}/><XAxis dataKey="label" tick={{ fill:C.textSoft,fontSize:12 }} axisLine={false} tickLine={false}/><YAxis tick={{ fill:C.textSoft,fontSize:11 }} axisLine={false} tickLine={false} width={56}/><Tooltip cursor={chartCursor} contentStyle={tooltipStyle} formatter={(v,n)=>[money(v),n]}/><Area type="monotone" dataKey="receitas" name="Receitas" stroke={C.lavender} fill="url(#incomeFill)" strokeWidth={2}/><Area type="monotone" dataKey="despesas" name="Despesas" stroke={C.purple} fill="url(#expenseFill)" strokeWidth={2}/></AreaChart></ResponsiveContainer></div>
          <p className="chart-summary">O traçado combina valores realizados e recorrências previstas. Abra Movimentações para conferir quais itens ainda estão planejados.</p>
        </Panel>

        <Panel title="Gastos por categoria" subtitle="Percentual do total de despesas">
          {metrics.categoryData.length ? <>
            <div className="chart-donut"><ResponsiveContainer><PieChart><Pie data={metrics.categoryData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={78} paddingAngle={2}>{metrics.categoryData.map((entry,i)=><Cell key={entry.name} fill={CATEGORY_COLORS[i%CATEGORY_COLORS.length]} stroke="none"/>)}</Pie><Tooltip cursor={false} contentStyle={tooltipStyle} formatter={(v,n)=>[`${money(v)} · ${((v/totalForPie)*100).toFixed(1)}%`,n]}/></PieChart></ResponsiveContainer><div className="donut-center"><span>Total</span><strong>{money(metrics.expense)}</strong></div></div>
            <div className="legend-list">{metrics.categoryData.slice(0,6).map((item,i)=><button key={item.name} onClick={()=>navigate(ROUTES.expenses)}><span className="legend-dot" style={{background:CATEGORY_COLORS[i%CATEGORY_COLORS.length]}}/><span>{item.name}</span><strong>{item.percentage.toFixed(0)}%</strong></button>)}</div>
            {onlyUncategorized && <div className="uncategorized-callout"><p>Esses gastos ainda não têm categoria confiável.</p><button className="ghost-btn" onClick={() => navigate(ROUTES.transactions)}>Revisar movimentações</button></div>}
          </> : <p className="empty-text">Sem despesas neste período.</p>}
        </Panel>
      </div>

      <div className="dashboard-grid dashboard-grid-secondary">
        <Panel title="Fluxo do dinheiro" subtitle="Receita → gastos → investimentos → sobra">
          <FinancialFlow metrics={metrics} />
        </Panel>

        <Panel title="Pix x cartão" subtitle="Quanto foi gasto em cada forma de pagamento" className="span-2">
          <div className="chart-medium"><ResponsiveContainer><BarChart data={monthlySeries} barGap={5}><CartesianGrid stroke={C.divider} vertical={false}/><XAxis dataKey="label" tick={{fill:C.textSoft,fontSize:12}} axisLine={false} tickLine={false}/><YAxis tick={{fill:C.textSoft,fontSize:11}} axisLine={false} tickLine={false} width={56}/><Tooltip cursor={chartCursor} contentStyle={tooltipStyle} formatter={(v,n)=>[money(v),n==="pix"?"Pix":"Cartão"]}/><Legend wrapperStyle={{fontSize:12}} formatter={(v)=>v==="pix"?"Pix":"Cartão"}/><Bar dataKey="pix" fill={C.lavender} radius={[6,6,0,0]}/><Bar dataKey="cartao" fill={C.purple} radius={[6,6,0,0]}/></BarChart></ResponsiveContainer></div>
          <div className="chart-kpis"><span>Pix <strong>{money(metrics.byPayment.Pix || 0)}</strong></span><span>Cartão <strong>{money((metrics.byPayment['Cartão de crédito'] || 0) + (metrics.byPayment['Cartão de débito'] || 0))}</strong></span></div>
        </Panel>
      </div>

      <div className="dashboard-grid dashboard-grid-secondary">
        <Panel title="Insights" subtitle="Sinais calculados a partir dos seus próprios dados" className="span-2"><div className="insight-list">{metrics.insights.slice(0,5).map((item,i)=><div key={i}><span>{String(i+1).padStart(2,'0')}</span><p>{item}</p></div>)}</div></Panel>
        <Panel title="Últimas movimentações" subtitle="Clique ou toque para ver detalhes"><div className="mini-transactions">{recentTransactions.slice(0,5).map((tx)=><button key={tx.id} onClick={()=>onEdit(tx)} disabled={String(tx.id).startsWith('planned:')}><div><strong title={tx.description}>{tx.description}</strong><span>{tx.category} · {tx.paymentMethod || 'Forma não informada'} · {tx.status === 'planned' ? 'Previsto' : 'Realizado'}</span></div><b className={tx.type==='receita'?'positive':''}>{tx.type==='receita'?'+':'-'}{money(tx.amount)}</b></button>)}{!recentTransactions.length&&<div className="empty-text"><p>Nenhuma movimentação ainda.</p><button className="primary-btn" onClick={onAdd}>Adicionar</button></div>}</div></Panel>
      </div>
    </>
  )
}
