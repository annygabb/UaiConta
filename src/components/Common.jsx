import React, { useEffect, useMemo, useRef, useState } from 'react'
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

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

export function PeriodSelector({ value, onChange, compact = false }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const selectedMonthRef = useRef(null)
  const selectedYearRef = useRef(null)
  const [year, month] = value.split('-').map(Number)
  const [draftMonth, setDraftMonth] = useState(month)
  const [draftYear, setDraftYear] = useState(year)

  const years = useMemo(() => {
    const now = new Date().getFullYear()
    const start = Math.min(now - 20, draftYear - 8)
    const end = Math.max(now + 12, draftYear + 8)
    return Array.from({ length: end - start + 1 }, (_, index) => start + index)
  }, [draftYear])

  useEffect(() => {
    if (!open) return undefined
    setDraftMonth(month)
    setDraftYear(year)
    const pointer = (event) => { if (!rootRef.current?.contains(event.target)) setOpen(false) }
    const keyboard = (event) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', pointer)
    document.addEventListener('keydown', keyboard)
    requestAnimationFrame(() => {
      selectedMonthRef.current?.scrollIntoView({ block: 'center' })
      selectedYearRef.current?.scrollIntoView({ block: 'center' })
    })
    return () => { document.removeEventListener('pointerdown', pointer); document.removeEventListener('keydown', keyboard) }
  }, [open, month, year])

  const shift = (delta) => {
    const date = new Date(year, month - 1 + delta, 1)
    onChange(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`)
  }

  const apply = () => {
    onChange(`${draftYear}-${String(draftMonth).padStart(2, '0')}`)
    setOpen(false)
  }

  const today = () => {
    const now = new Date()
    onChange(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
    setOpen(false)
  }

  return (
    <div className={`period-selector period-selector-v6 ${compact ? 'is-compact' : ''}`} aria-label="Selecionar período" ref={rootRef}>
      {!compact && <button type="button" className="period-shift" onClick={() => shift(-1)} aria-label="Mês anterior"><IconChevronLeft size={18} /></button>}
      <button type="button" className="period-center" onClick={() => setOpen((current) => !current)} aria-expanded={open} aria-haspopup="dialog">
        <IconCalendarMonth size={18} stroke={1.8} /><span>{periodLabel(value)}</span>
      </button>
      {!compact && <button type="button" className="period-shift" onClick={() => shift(1)} aria-label="Próximo mês"><IconChevronRight size={18} /></button>}
      {open && (
        <div className="period-popover period-wheel-popover" role="dialog" aria-label="Escolher mês e ano">
          <div className="wheel-heading"><span>Mês</span><span>Ano</span></div>
          <div className="period-wheel-grid">
            <div className="wheel-column" aria-label="Mês">
              <span className="wheel-spacer" aria-hidden="true" />
              {MONTHS.map((label, index) => {
                const valueMonth = index + 1
                const active = draftMonth === valueMonth
                return <button ref={active ? selectedMonthRef : undefined} type="button" key={label} className={active ? 'active' : ''} onClick={() => setDraftMonth(valueMonth)}>{label}</button>
              })}
              <span className="wheel-spacer" aria-hidden="true" />
            </div>
            <div className="wheel-column" aria-label="Ano">
              <span className="wheel-spacer" aria-hidden="true" />
              {years.map((valueYear) => {
                const active = draftYear === valueYear
                return <button ref={active ? selectedYearRef : undefined} type="button" key={valueYear} className={active ? 'active' : ''} onClick={() => setDraftYear(valueYear)}>{valueYear}</button>
              })}
              <span className="wheel-spacer" aria-hidden="true" />
            </div>
            <span className="wheel-selection-band" aria-hidden="true" />
          </div>
          <div className="period-wheel-actions"><button type="button" className="ghost-btn" onClick={today}>Este mês</button><button type="button" className="primary-btn" onClick={apply}>Aplicar</button></div>
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
