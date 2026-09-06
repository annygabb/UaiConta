import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  IconChartDonut3,
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

export function Sidebar({ onAdd }) {
  return (
    <aside className="sidebar">
      <NavLink className="brand" to={ROUTES.dashboard}>
        <span className="brand-mark"><IconCoin size={19} /></span>
        <span><strong>UaiConta</strong><small>Finance OS</small></span>
      </NavLink>
      <nav className="side-nav" aria-label="Navegação principal">
        {items.map(({ route, desktop, icon: Icon }) => (
          <NavLink key={route} className={activeClass} to={route}>
            <Icon size={18} /> <span>{desktop}</span>
          </NavLink>
        ))}
      </nav>
      <button type="button" className="side-add" onClick={onAdd}><IconPlus size={18} /> Nova movimentação</button>
      <div className="side-status"><span className="status-dot" /> <span>Seu dinheiro, mais claro.</span></div>
    </aside>
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
