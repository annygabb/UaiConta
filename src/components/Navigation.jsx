'use client'

import React, { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { NavLink } from 'react-router-dom'
import {
  IconAdjustmentsHorizontal,
  IconChartHistogram,
  IconChevronLeft,
  IconChevronRight,
  IconLayoutDashboard,
  IconPlus,
  IconReceipt2,
} from '@tabler/icons-react'
import { ROUTES } from '../constants.js'
import BrandLogo from './ui/BrandLogo.jsx'

const items = [
  { route: ROUTES.dashboard, label: 'Início', desktop: 'Visão geral', icon: IconLayoutDashboard },
  { route: ROUTES.transactions, label: 'Mov.', desktop: 'Movimentações', icon: IconReceipt2 },
  { route: ROUTES.analytics, label: 'Análises', desktop: 'Análises', icon: IconChartHistogram },
  { route: ROUTES.more, label: 'Mais', desktop: 'Mais', icon: IconAdjustmentsHorizontal },
]

const activeClass = ({ isActive }) => (isActive ? 'active' : '')
const SIDEBAR_KEY = 'uaiconta-sidebar-collapsed-v2'

export function Sidebar({ onAdd, userName = '' }) {
  const reduce = useReducedMotion() ?? false
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(SIDEBAR_KEY) === 'true' } catch { return false }
  })

  useEffect(() => {
    try { localStorage.setItem(SIDEBAR_KEY, String(collapsed)) } catch {}
  }, [collapsed])

  const transition = reduce ? { duration: 0 } : { type: 'spring', stiffness: 390, damping: 36, mass: 0.7 }

  return (
    <motion.aside
      className={`sidebar animated-sidebar ${collapsed ? 'is-collapsed' : ''}`}
      initial={false}
      animate={{ width: collapsed ? 68 : 238 }}
      transition={transition}
      aria-label="Navegação principal"
    >
      <div className="animated-sidebar-head">
        <NavLink className="brand sidebar-brand" to={ROUTES.dashboard} aria-label="UaiConta — início">
          <BrandLogo compact={collapsed} size={collapsed ? 42 : 46} />
        </NavLink>
        <button
          type="button"
          className="sidebar-collapse"
          onClick={() => setCollapsed((current) => !current)}
          aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
          title={collapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {collapsed ? <IconChevronRight size={18} /> : <IconChevronLeft size={18} />}
        </button>
      </div>

      <nav className="side-nav" aria-label="Navegação principal">
        {items.map(({ route, desktop, icon: Icon }) => (
          <NavLink key={route} className={activeClass} to={route} title={collapsed ? desktop : undefined} aria-label={desktop}>
            {({ isActive }) => (
              <>
                {isActive && <motion.span layoutId="uaiconta-sidebar-active" className="sidebar-active-pill" transition={transition} />}
                <span className="sidebar-icon-wrap"><Icon size={20} stroke={1.75} className="sidebar-nav-icon" /></span>
                <AnimatePresence initial={false}>
                  {!collapsed && (
                    <motion.span
                      key={`${route}-label`}
                      className="sidebar-nav-label"
                      initial={reduce ? { opacity: 0 } : { opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={reduce ? { opacity: 0 } : { opacity: 0, x: -4 }}
                      transition={{ duration: reduce ? 0 : 0.16 }}
                    >{desktop}</motion.span>
                  )}
                </AnimatePresence>
                {collapsed && <span className="sidebar-tooltip" role="tooltip">{desktop}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <motion.button type="button" className="side-add" onClick={onAdd} whileTap={reduce ? undefined : { scale: 0.97 }} title={collapsed ? 'Nova movimentação' : undefined} aria-label="Nova movimentação">
        <span className="sidebar-icon-wrap"><IconPlus size={20} /></span>
        <AnimatePresence initial={false}>{!collapsed && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>Nova movimentação</motion.span>}</AnimatePresence>
        {collapsed && <span className="sidebar-tooltip" role="tooltip">Nova movimentação</span>}
      </motion.button>

      <div className="side-status">
        <span className="status-dot" />
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {userName ? `Olá, ${userName.split(' ')[0]}.` : 'Seu dinheiro, mais claro.'}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </motion.aside>
  )
}

export function MobileNav({ onAdd }) {
  return (
    <nav className="mobile-nav" aria-label="Navegação mobile">
      {items.slice(0, 2).map(({ route, label, icon: Icon }) => (
        <NavLink key={route} className={activeClass} to={route} aria-label={label}>
          <Icon size={20} stroke={1.75} /><span>{label}</span>
        </NavLink>
      ))}
      <button type="button" className="mobile-add" onClick={onAdd} aria-label="Adicionar movimentação"><IconPlus size={23} /></button>
      {items.slice(2).map(({ route, label, icon: Icon }) => (
        <NavLink key={route} className={activeClass} to={route} aria-label={label}>
          <Icon size={20} stroke={1.75} /><span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
