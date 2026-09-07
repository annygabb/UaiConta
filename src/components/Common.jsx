import React, { useEffect, useRef, useState } from 'react'
import {
  IconArrowDownRight,
  IconArrowRight,
  IconArrowUpRight,
  IconCalendarMonth,
  IconChevronLeft,
  IconChevronRight,
} from '@tabler/icons-react'
import { C } from '../theme.js'
import { money, pct, periodLabel } from '../utils.js'
import RotatingCoin from './ui/RotatingCoin.jsx'

export function Panel({ title, subtitle, right, children, className = '', onClick }) {
  const Tag = onClick ? 'button' : 'section'
  return (
    <Tag type={onClick ? 'button' : undefined} onClick={onClick} className={`panel ${onClick ? 'panel-clickable' : ''} ${className}`}>
      {(title || right) && <div className="panel-head"><div className="min-w-0">{title && <h2>{title}</h2>}{subtitle && <p>{subtitle}</p>}</div>{right}</div>}
      {children}
    </Tag>
  )
}

export function MetricCard({ label, value, delta = null, icon: Icon, accent = C.lavender, helper, onClick }) {
  const positive = Number(delta || 0) >= 0
  return (
    <button type="button" className="metric-card" onClick={onClick} aria-label={`Abrir detalhes de ${label}`}>
      <div className="metric-topline"><span>{label}</span><div className="metric-icon" style={{ '--accent': accent }}><Icon size={18} stroke={1.7} /></div></div>
      <strong>{money(value)}</strong>
      <div className="metric-footer">
        {delta !== null ? <span className={positive ? 'metric-positive' : 'metric-negative'}>{positive ? <IconArrowUpRight size={14} /> : <IconArrowDownRight size={14} />}{pct(delta)} vs mês anterior</span> : <span>{helper || 'Ver detalhes'}</span>}
        <IconArrowRight size={15} className="metric-arrow" />
      </div>
    </button>
  )
}

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

export function PeriodSelector({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const [year, month] = value.split('-').map(Number)

  useEffect(() => {
    if (!open) return undefined
    const pointer = (event) => { if (!rootRef.current?.contains(event.target)) setOpen(false) }
    const keyboard = (event) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', pointer)
    document.addEventListener('keydown', keyboard)
    return () => { document.removeEventListener('pointerdown', pointer); document.removeEventListener('keydown', keyboard) }
  }, [open])

  const shift = (delta) => {
    const date = new Date(year, month - 1 + delta, 1)
    onChange(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`)
  }

  const choose = (nextMonth) => {
    onChange(`${year}-${String(nextMonth).padStart(2, '0')}`)
    setOpen(false)
  }

  return (
    <div className="period-selector period-selector-v5" aria-label="Selecionar período" ref={rootRef}>
      <button type="button" onClick={() => shift(-1)} aria-label="Mês anterior"><IconChevronLeft size={18} /></button>
      <button type="button" className="period-center" onClick={() => setOpen((current) => !current)} aria-expanded={open} aria-haspopup="dialog">
        <IconCalendarMonth size={18} stroke={1.8} /><span>{periodLabel(value)}</span>
      </button>
      <button type="button" onClick={() => shift(1)} aria-label="Próximo mês"><IconChevronRight size={18} /></button>
      {open && (
        <div className="period-popover" role="dialog" aria-label="Escolher mês e ano">
          <div className="period-year-row">
            <button type="button" onClick={() => onChange(`${year - 1}-${String(month).padStart(2, '0')}`)} aria-label="Ano anterior"><IconChevronLeft size={17} /></button>
            <strong>{year}</strong>
            <button type="button" onClick={() => onChange(`${year + 1}-${String(month).padStart(2, '0')}`)} aria-label="Próximo ano"><IconChevronRight size={17} /></button>
          </div>
          <div className="period-month-grid">
            {MONTHS.map((label, index) => <button type="button" key={label} className={month === index + 1 ? 'active' : ''} onClick={() => choose(index + 1)}>{label}</button>)}
          </div>
        </div>
      )}
    </div>
  )
}

export function EmptyBlock({ title, text, action, actionLabel = 'Adicionar movimentação' }) {
  return <div className="empty-block"><div className="empty-orb" aria-hidden="true" /><strong>{title}</strong><p>{text}</p>{action && <button className="primary-btn" onClick={action}>{actionLabel}</button>}</div>
}

export function SpatialOrb(props) { return <RotatingCoin {...props} /> }

export function Badge({ children, tone = 'neutral' }) { return <span className={`badge badge-${tone}`}>{children}</span> }
