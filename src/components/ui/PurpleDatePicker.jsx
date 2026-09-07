'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import { IconCalendar, IconChevronDown } from '@tabler/icons-react'

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

function parseIso(value) {
  if (!value) return undefined
  const [year, month, day] = String(value).split('-').map(Number)
  if (!year || !month || !day) return undefined
  return new Date(year, month - 1, day, 12, 0, 0)
}

function toIso(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function dateLabel(value, placeholder) {
  const parsed = parseIso(value)
  if (!parsed) return placeholder
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(parsed)
}

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate()
}

function withinRange(date, minDate, maxDate) {
  if (minDate && date < minDate) return false
  if (maxDate && date > maxDate) return false
  return true
}

function centerWheelItem(ref) {
  const node = ref.current
  const column = node?.parentElement
  if (!node || !column) return
  column.scrollTop = Math.max(0, node.offsetTop - ((column.clientHeight - node.offsetHeight) / 2))
}

export default function PurpleDatePicker({ value, onChange, min, max, placeholder = 'Selecionar data', ariaLabel = 'Selecionar data', disabled = false }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const dayRef = useRef(null)
  const monthRef = useRef(null)
  const yearRef = useRef(null)
  const reduce = useReducedMotion() ?? false
  const selected = parseIso(value) || new Date()
  const minDate = parseIso(min)
  const maxDate = parseIso(max)
  const [draftDay, setDraftDay] = useState(selected.getDate())
  const [draftMonth, setDraftMonth] = useState(selected.getMonth() + 1)
  const [draftYear, setDraftYear] = useState(selected.getFullYear())

  const yearValues = useMemo(() => {
    const now = new Date().getFullYear()
    const first = minDate?.getFullYear() ?? Math.min(now - 80, draftYear - 20)
    const last = maxDate?.getFullYear() ?? Math.max(now + 20, draftYear + 20)
    return Array.from({ length: Math.max(1, last - first + 1) }, (_, index) => first + index)
  }, [draftYear, minDate, maxDate])

  const dayValues = useMemo(() => Array.from({ length: daysInMonth(draftYear, draftMonth) }, (_, index) => index + 1), [draftMonth, draftYear])

  useEffect(() => {
    const maxDay = daysInMonth(draftYear, draftMonth)
    if (draftDay > maxDay) setDraftDay(maxDay)
  }, [draftDay, draftMonth, draftYear])

  useEffect(() => {
    if (!open) return undefined
    const source = parseIso(value) || new Date()
    setDraftDay(source.getDate())
    setDraftMonth(source.getMonth() + 1)
    setDraftYear(source.getFullYear())
    const onPointerDown = (event) => { if (!rootRef.current?.contains(event.target) && !event.target.closest?.('.date-wheel-popover')) setOpen(false) }
    const onKeyDown = (event) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    const timer = window.setTimeout(() => {
      centerWheelItem(dayRef)
      centerWheelItem(monthRef)
      centerWheelItem(yearRef)
    }, reduce ? 0 : 30)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, reduce, value])

  const apply = () => {
    const next = new Date(draftYear, draftMonth - 1, draftDay, 12, 0, 0)
    if (!withinRange(next, minDate, maxDate)) return
    onChange?.(toIso(next))
    setOpen(false)
  }

  const chooseToday = () => {
    const now = new Date()
    const safe = withinRange(now, minDate, maxDate) ? now : (minDate || maxDate)
    if (!safe) return
    onChange?.(toIso(safe))
    setOpen(false)
  }

  const draftDate = new Date(draftYear, draftMonth - 1, draftDay, 12, 0, 0)
  const validDraft = withinRange(draftDate, minDate, maxDate)

  return (
    <div className="purple-date-picker purple-date-picker-v6" ref={rootRef}>
      <button type="button" className="purple-date-trigger" aria-label={ariaLabel} aria-expanded={open} disabled={disabled} onClick={() => setOpen((current) => !current)}>
        <span className="purple-date-trigger-main"><IconCalendar size={18} stroke={1.8} className="purple-date-icon" /><span>{dateLabel(value, placeholder)}</span></span>
        <IconChevronDown size={16} className={open ? 'rotate-180' : ''} />
      </button>
      {open && (
        <div className="purple-calendar-popover date-wheel-popover" role="dialog" aria-label={ariaLabel}>
          <div className="date-wheel-heading"><span>Dia</span><span>Mês</span><span>Ano</span></div>
          <div className="date-wheel-grid">
            <div className="wheel-column" aria-label="Dia">
              <span className="wheel-spacer" aria-hidden="true" />
              {dayValues.map((day) => <button ref={draftDay === day ? dayRef : undefined} type="button" className={draftDay === day ? 'active' : ''} key={day} onClick={() => setDraftDay(day)}>{String(day).padStart(2, '0')}</button>)}
              <span className="wheel-spacer" aria-hidden="true" />
            </div>
            <div className="wheel-column" aria-label="Mês">
              <span className="wheel-spacer" aria-hidden="true" />
              {MONTHS.map((label, index) => {
                const month = index + 1
                return <button ref={draftMonth === month ? monthRef : undefined} type="button" className={draftMonth === month ? 'active' : ''} key={label} onClick={() => setDraftMonth(month)}>{label}</button>
              })}
              <span className="wheel-spacer" aria-hidden="true" />
            </div>
            <div className="wheel-column" aria-label="Ano">
              <span className="wheel-spacer" aria-hidden="true" />
              {yearValues.map((year) => <button ref={draftYear === year ? yearRef : undefined} type="button" className={draftYear === year ? 'active' : ''} key={year} onClick={() => setDraftYear(year)}>{year}</button>)}
              <span className="wheel-spacer" aria-hidden="true" />
            </div>
            <span className="wheel-selection-band" aria-hidden="true" />
          </div>
          {!validDraft && <p className="date-wheel-error">Essa data está fora do intervalo permitido.</p>}
          <div className="date-wheel-actions"><button type="button" className="ghost-btn" onClick={chooseToday}>Hoje</button><button type="button" className="primary-btn" disabled={!validDraft} onClick={apply}>Aplicar</button></div>
        </div>
      )}
    </div>
  )
}
