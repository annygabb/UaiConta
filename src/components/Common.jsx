import React from "react";
import { ArrowDownRight, ArrowRight, ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import { C } from "../theme.js";
import { money, pct, periodLabel } from "../utils.js";

export function Panel({ title, subtitle, right, children, className = "", onClick }) {
  const Tag = onClick ? "button" : "section";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`panel ${onClick ? "panel-clickable" : ""} ${className}`}
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
  );
}

export function MetricCard({ label, value, delta = null, icon: Icon, accent = C.lavender, helper, onClick }) {
  const positive = Number(delta || 0) >= 0;
  return (
    <button type="button" className="metric-card" onClick={onClick} aria-label={`Abrir detalhes de ${label}`}>
      <div className="metric-topline">
        <span>{label}</span>
        <div className="metric-icon" style={{ "--accent": accent }}><Icon size={16} /></div>
      </div>
      <strong>{money(value)}</strong>
      <div className="metric-footer">
        {delta !== null ? (
          <span className={positive ? "metric-positive" : "metric-negative"}>
            {positive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
            {pct(delta)} vs mês anterior
          </span>
        ) : <span>{helper || "Ver detalhes"}</span>}
        <ArrowRight size={14} className="metric-arrow" />
      </div>
    </button>
  );
}

export function PeriodSelector({ value, onChange }) {
  const shift = (delta) => {
    const [year, month] = value.split("-").map(Number);
    const date = new Date(year, month - 1 + delta, 1);
    onChange(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`);
  };
  return (
    <div className="period-selector" aria-label="Selecionar período">
      <button type="button" onClick={() => shift(-1)} aria-label="Mês anterior"><ChevronLeft size={17} /></button>
      <label>
        <span>{periodLabel(value)}</span>
        <input type="month" value={value} onChange={(event) => event.target.value && onChange(event.target.value)} aria-label="Escolher mês e ano" />
      </label>
      <button type="button" onClick={() => shift(1)} aria-label="Próximo mês"><ChevronRight size={17} /></button>
    </div>
  );
}

export function EmptyBlock({ title, text, action, actionLabel = "Adicionar movimentação" }) {
  return (
    <div className="empty-block">
      <div className="empty-orb" aria-hidden="true" />
      <strong>{title}</strong>
      <p>{text}</p>
      {action && <button className="primary-btn" onClick={action}>{actionLabel}</button>}
    </div>
  );
}

export function SpatialOrb({ value = 0, label = "Sobra estimada" }) {
  return (
    <div className="spatial-wrap" aria-label={`${label}: ${money(value)}`}>
      <div className="spatial-scene" aria-hidden="true">
        <div className="orbit orbit-a" />
        <div className="orbit orbit-b" />
        <div className="orbit orbit-c" />
        <div className="spatial-core" />
        <span className="particle p1" />
        <span className="particle p2" />
        <span className="particle p3" />
      </div>
      <div className="spatial-copy">
        <span>{label}</span>
        <strong className={value < 0 ? "negative" : ""}>{money(value)}</strong>
        <small>Projeção baseada no ritmo atual do período.</small>
      </div>
    </div>
  );
}

export function Badge({ children, tone = "neutral" }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
