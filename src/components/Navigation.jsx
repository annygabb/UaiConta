'use client'

import React, { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { NavLink } from 'react-router-dom'
import {
  IconChartDonut3,
  IconChevronLeft,
  IconChevronRight,
  IconCoin,
  IconHome,
  IconListDetails,
  IconMenu2,
  IconPlus,
} from '@tabler/icons-react'
import { ROUTES } from '../constants.js'

const items = [
  { route: ROUTES.dashboard, label: 'Início', desktop: 'Visão geral', icon: IconHome },
  { route: ROUTES.transactions, label: 'Mov.', desktop: 'Movimentações', icon: IconListDetails },
  { route: ROUTES.analytics, label: 'Análises', desktop: 'Análises', icon: IconChartDonut3 },
  { route: ROUTES.more, label: 'Mais', desktop: 'Mais', icon: IconMenu2 },
]

const activeClass = ({ isActive }) => (isActive ? 'active' : '')
const SIDEBAR_KEY = 'uaiconta-sidebar-collapsed-v1'

export function Sidebar({ onAdd, userName = '' }) {
  const reduce = useReducedMotion() ?? false
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(SIDEBAR_KEY) === 'true' } catch { return false }
  })

  useEffect(() => {
    try { localStorage.setItem(SIDEBAR_KEY, String(collapsed)) } catch {}
  }, [collapsed])

  const transition = reduce ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 35, mass: 0.75 }

  return (
    <motion.aside
      className={`sidebar animated-sidebar ${collapsed ? 'is-collapsed' : ''}`}
      initial={false}
      animate={{ width: collapsed ? 76 : 248 }}
      transition={transition}
      aria-label="Navegação principal"
    >
      <div className="animated-sidebar-head">
        <NavLink className="brand" to={ROUTES.dashboard} aria-label="UaiConta — início">
          <span className="brand-mark"><IconCoin size={19} /></span>
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.span
                key="brand-copy"
                initial={reduce ? { opacity: 0 } : { opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, x: -5 }}
                transition={{ duration: reduce ? 0 : 0.18 }}
              >
                <strong>UaiConta</strong><small>Finance OS</small>
              </motion.span>
            )}
          </AnimatePresence>
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
          <NavLink key={route} className={activeClass} to={route} title={collapsed ? desktop : undefined}>
            {({ isActive }) => (
              <>
                {isActive && <motion.span layoutId="uaiconta-sidebar-active" className="sidebar-active-pill" transition={transition} />}
                <Icon size={18} className="sidebar-nav-icon" />
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
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <motion.button type="button" className="side-add" onClick={onAdd} whileTap={reduce ? undefined : { scale: 0.98 }} title={collapsed ? 'Nova movimentação' : undefined}>
        <IconPlus size={18} />
        <AnimatePresence initial={false}>{!collapsed && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>Nova movimentação</motion.span>}</AnimatePresence>
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
        <NavLink key={route} className={activeClass} to={route}>
          <Icon size={19} /><span>{label}</span>
        </NavLink>
      ))}
      <button type="button" className="mobile-add" onClick={onAdd} aria-label="Adicionar movimentação"><IconPlus size={23} /></button>
      {items.slice(2).map(({ route, label, icon: Icon }) => (
        <NavLink key={route} className={activeClass} to={route}>
          <Icon size={19} /><span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
