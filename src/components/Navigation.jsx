import React from "react";
import { BarChart3, CircleDollarSign, Home, ListTree, MoreHorizontal, Plus } from "lucide-react";
import { ROUTES } from "../constants.js";
import { navigate } from "../router.js";

const items = [
  { route: ROUTES.dashboard, label: "Início", desktop: "Visão geral", icon: Home },
  { route: ROUTES.transactions, label: "Mov.", desktop: "Movimentações", icon: ListTree },
  { route: ROUTES.analytics, label: "Análises", desktop: "Análises", icon: BarChart3 },
  { route: ROUTES.more, label: "Mais", desktop: "Mais", icon: MoreHorizontal },
];

export function Sidebar({ route, onAdd }) {
  return (
    <aside className="sidebar">
      <button type="button" className="brand" onClick={() => navigate(ROUTES.dashboard)}>
        <span className="brand-mark"><CircleDollarSign size={19} /></span>
        <span><strong>UaiConta</strong><small>Finance OS</small></span>
      </button>
      <nav className="side-nav" aria-label="Navegação principal">
        {items.map(({ route: itemRoute, desktop, icon: Icon }) => (
          <button key={itemRoute} type="button" className={route === itemRoute ? "active" : ""} onClick={() => navigate(itemRoute)}>
            <Icon size={18} /> <span>{desktop}</span>
          </button>
        ))}
      </nav>
      <button type="button" className="side-add" onClick={onAdd}><Plus size={18} /> Nova movimentação</button>
      <div className="side-status"><span className="status-dot" /> <span>Seu dinheiro, mais claro.</span></div>
    </aside>
  );
}

export function MobileNav({ route, onAdd }) {
  return (
    <nav className="mobile-nav" aria-label="Navegação mobile">
      {items.slice(0, 2).map(({ route: itemRoute, label, icon: Icon }) => (
        <button key={itemRoute} className={route === itemRoute ? "active" : ""} onClick={() => navigate(itemRoute)}>
          <Icon size={19} /><span>{label}</span>
        </button>
      ))}
      <button type="button" className="mobile-add" onClick={onAdd} aria-label="Adicionar movimentação"><Plus size={23} /></button>
      {items.slice(2).map(({ route: itemRoute, label, icon: Icon }) => (
        <button key={itemRoute} className={route === itemRoute ? "active" : ""} onClick={() => navigate(itemRoute)}>
          <Icon size={19} /><span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
