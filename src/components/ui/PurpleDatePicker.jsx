'use client'

import React, { useEffect, useRef, useState } from 'react'
import { DayPicker } from 'react-day-picker'
import { ptBR } from 'react-day-picker/locale'
import 'react-day-picker/style.css'
import { IconCalendar, IconChevronDown } from '@tabler/icons-react'

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

const calendarClassNames = {
  root: 'purple-calendar-root',
  months: 'purple-calendar-months',
  month: 'purple-calendar-month',
  month_caption: 'purple-calendar-month-caption',
  caption_label: 'purple-calendar-caption-label',
  nav: 'purple-calendar-nav',
  button_previous: 'purple-calendar-nav-button previous',
  button_next: 'purple-calendar-nav-button next',
  month_grid: 'purple-calendar-grid',
  weekdays: 'purple-calendar-weekdays',
  weekday: 'purple-calendar-weekday',
  week: 'purple-calendar-week',
  day: 'purple-calendar-day',
  day_button: 'purple-calendar-day-button',
  today: 'purple-calendar-today',
  selected: 'purple-calendar-selected',
  outside: 'purple-calendar-outside',
  disabled: 'purple-calendar-disabled',
  chevron: 'purple-calendar-chevron',
}

export default function PurpleDatePicker({ value, onChange, min, max, placeholder = 'Selecionar data', ariaLabel = 'Selecionar data', disabled = false }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const selected = parseIso(value)
  const minDate = parseIso(min)
  const maxDate = parseIso(max)

  useEffect(() => {
    if (!open) return undefined
    const onPointerDown = (event) => { if (!rootRef.current?.contains(event.target)) setOpen(false) }
    const onKeyDown = (event) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => { document.removeEventListener('pointerdown', onPointerDown); document.removeEventListener('keydown', onKeyDown) }
  }, [open])

  const disabledMatchers = [minDate ? { before: minDate } : null, maxDate ? { after: maxDate } : null].filter(Boolean)

  return (
    <div className="purple-date-picker purple-date-picker-v5" ref={rootRef}>
      <button type="button" className="purple-date-trigger" aria-label={ariaLabel} aria-expanded={open} disabled={disabled} onClick={() => setOpen((current) => !current)}>
        <span><IconCalendar size={18} stroke={1.8} className="purple-date-icon" /> {dateLabel(value, placeholder)}</span>
        <IconChevronDown size={16} className={open ? 'rotate-180' : ''} />
      </button>
      {open && (
        <div className="purple-calendar-popover" role="dialog" aria-label={ariaLabel}>
          <DayPicker
            mode="single"
            selected={selected}
            defaultMonth={selected || minDate || new Date()}
            onSelect={(next) => { if (!next) return; onChange?.(toIso(next)); setOpen(false) }}
            locale={ptBR}
            weekStartsOn={0}
            fixedWeeks
            showOutsideDays
            disabled={disabledMatchers.length ? disabledMatchers : undefined}
            classNames={calendarClassNames}
          />
          <div className="purple-calendar-footer"><span>Hoje</span><button type="button" onClick={() => { onChange?.(toIso(new Date())); setOpen(false) }}>Selecionar hoje</button></div>
        </div>
      )}
    </div>
  )
}
