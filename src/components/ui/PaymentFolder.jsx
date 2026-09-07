'use client'

import React, { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { IconChevronDown, IconWallet } from '@tabler/icons-react'
import { money } from '../../utils.js'

export default function PaymentFolder({
  title,
  subtitle,
  amount = 0,
  breakdown = [],
  icon: Icon = IconWallet,
  accent = '#7B337E',
  actionLabel,
  onAction,
}) {
  const reduce = useReducedMotion() ?? false
  const [open, setOpen] = useState(false)
  const spring = reduce ? { duration: 0 } : { type: 'spring', stiffness: 360, damping: 32, mass: 0.8 }

  return (
    <article className="payment-folder" data-open={open ? 'true' : 'false'} style={{ '--folder-accent': accent }}>
      <button
        type="button"
        className="payment-folder-toggle"
        aria-expanded={open}
        aria-label={`${open ? 'Fechar' : 'Abrir'} ${title}`}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="payment-folder-back" aria-hidden="true" />
        <motion.span
          className="payment-folder-card"
          initial={false}
          animate={{ y: open ? -18 : 0, scale: open ? 1.015 : 1 }}
          transition={spring}
        >
          <span className="payment-folder-card-top"><span className="payment-folder-icon"><Icon size={19} /></span><small>{subtitle}</small></span>
          <strong>{title}</strong>
          <b>{money(amount)}</b>
        </motion.span>
        <motion.span
          className="payment-folder-front"
          aria-hidden="true"
          initial={false}
          animate={{ rotateX: open ? -23 : 0, y: open ? 8 : 0 }}
          transition={spring}
        >
          <i />
        </motion.span>
        <motion.span className="payment-folder-chevron" animate={{ rotate: open ? 180 : 0 }} transition={spring}><IconChevronDown size={16} /></motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            className="payment-folder-details"
            initial={reduce ? { opacity: 0 } : { opacity: 0, height: 0, y: -6 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0, y: -6 }}
            transition={reduce ? { duration: 0.12 } : { duration: 0.22 }}
          >
            {breakdown.length ? breakdown.map((item) => (
              <div key={item.label}><span>{item.label}</span><strong>{typeof item.value === 'number' ? money(item.value) : item.value}</strong></div>
            )) : <p>Sem movimentações neste período.</p>}
            {onAction && <button type="button" className="ghost-btn payment-folder-action" onClick={onAction}>{actionLabel || 'Ver detalhes'}</button>}
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  )
}
