import React from 'react'
import {
  IconArrowDownRight,
  IconArrowRight,
  IconArrowUpRight,
  IconChevronLeft,
  IconChevronRight,
} from '@tabler/icons-react'
import { C } from '../theme.js'
import { money, pct, periodLabel } from '../utils.js'

export function Panel({ title, subtitle, right, children, className = '', onClick }) {
  const Tag = onClick ? 'button' : 'section'
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`panel ${onClick ? 'panel-clickable' : ''} ${className}`}
    >
      {(title || right) && (
        <div className="panel-head">
          <div className="min-w-0">
            {title && <h2>{title}</h2>}
            {subtitle && <p>{subtitle}</p>}
          </div>
          {right}
        </div>
      )}
      {children}
    </Tag>
  )
}

export function MetricCard({ label, value, delta = null, icon: Icon, accent = C.lavender, helper, onClick }) {
  const positive = Number(delta || 0) >= 0
  return (
    <button type="button" className="metric-card" onClick={onClick} aria-label={`Abrir detalhes de ${label}`}>
      <div className="metric-topline">
        <span>{label}</span>
        <div className="metric-icon" style={{ '--accent': accent }}><Icon size={18} stroke={1.7} /></div>
      </div>
      <strong>{money(value)}</strong>
      <div className="metric-footer">
        {delta !== null ? (
          <span className={positive ? 'metric-positive' : 'metric-negative'}>
            {positive ? <IconArrowUpRight size={14} /> : <IconArrowDownRight size={14} />}
            {pct(delta)} vs mês anterior
          </span>
        ) : <span>{helper || 'Ver detalhes'}</span>}
        <IconArrowRight size={15} className="metric-arrow" />
      </div>
    </button>
  )
}

export function PeriodSelector({ value, onChange }) {
  const shift = (delta) => {
    const [year, month] = value.split('-').map(Number)
    const date = new Date(year, month - 1 + delta, 1)
    onChange(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`)
  }
  return (
    <div className="period-selector" aria-label="Selecionar período">
      <button type="button" onClick={() => shift(-1)} aria-label="Mês anterior"><IconChevronLeft size={18} /></button>
      <label>
        <span>{periodLabel(value)}</span>
        <input type="month" value={value} onChange={(event) => event.target.value && onChange(event.target.value)} aria-label="Escolher mês e ano" />
      </label>
      <button type="button" onClick={() => shift(1)} aria-label="Próximo mês"><IconChevronRight size={18} /></button>
    </div>
  )
}

export function EmptyBlock({ title, text, action, actionLabel = 'Adicionar movimentação' }) {
  return (
    <div className="empty-block">
      <div className="empty-orb" aria-hidden="true" />
      <strong>{title}</strong>
      <p>{text}</p>
      {action && <button className="primary-btn" onClick={action}>{actionLabel}</button>}
    </div>
  )
}

/**
 * Elemento espacial do dashboard. O efeito 3D é deliberadamente leve e todos
 * os números vêm da mesma fonte de verdade financeira usada pelos cards.
 */
export function SpatialOrb({ realized = 0, forecast = 0, income = 0, committedRate = 0 }) {
  const safeRate = Math.max(0, Math.min(100, Number(committedRate || 0)))
  return (
    <div className="spatial-wrap" aria-label={`Sobra realizada ${money(realized)}. Sobra prevista ${money(forecast)}.`}>
      <div className="spatial-scene" aria-hidden="true" style={{ '--commit': `${safeRate * 3.6}deg` }}>
        <div className="orbit orbit-a" />
        <div className="orbit orbit-b" />
        <div className="orbit orbit-c" />
        <div className="spatial-core" />
        <div className="spatial-progress" />
        <span className="particle p1" />
        <span className="particle p2" />
        <span className="particle p3" />
      </div>
      <div className="spatial-copy">
        <span>Sobra prevista</span>
        <strong className={forecast < 0 ? 'negative' : ''}>{money(forecast)}</strong>
        <small>{income > 0 ? `${safeRate.toFixed(0)}% da renda comprometida · realizado ${money(realized)}` : 'Cadastre receitas para calcular a projeção.'}</small>
      </div>
    </div>
  )
}

export function Badge({ children, tone = 'neutral' }) {
  return <span className={`badge badge-${tone}`}>{children}</span>
}
