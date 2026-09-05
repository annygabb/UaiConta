import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend,
} from "recharts";
import {
  Plus, TrendingUp, TrendingDown, Wallet, PiggyBank, CreditCard,
  X, Pencil, Copy, Trash2, Home, ListTree, BarChart3, MoreHorizontal,
  ArrowUpRight, ArrowDownRight, Search, Sparkles, FileText, Loader2,
  CheckCircle2, AlertCircle, ArrowRight, Banknote,
} from "lucide-react";
import { CATEGORIES, INCOME_CATEGORIES, PAYMENT_METHODS } from "./constants.js";
import storage from "./storage.js";

/* ------------------------------------------------------------------ */
/* Tokens — paleta Moon                                                */
/* ------------------------------------------------------------------ */
const C = {
  bg: "#09070D",
  bg2: "#0D0912",
  surface: "#120D18",
  surface2: "#181020",
  text: "#F7F4FA",
  textSoft: "#AAA2B3",
  divider: "rgba(255,255,255,0.07)",
  lavender: "#6667AB",
  purple: "#7B337E",
  purpleDark: "#420D4B",
  purpleDeep: "#210635",
  pink: "#F5D5E0",
};

const CATEGORY_COLORS = [
  "#6667AB", "#7B337E", "#9C4B93", "#8A6FC7", "#B85FA0",
  "#5C3A82", "#D68FC0", "#4F2E68", "#F0B8CE", "#3A1F52", "#C7A0D6",
];

const STORAGE_KEY = "pfos-transactions-v1";
const ONBOARDING_KEY = "pfos-onboarded-v1";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
const money = (v) =>
  (v < 0 ? "-" : "") + "R$ " + Math.abs(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const pct = (v) => `${v > 0 ? "+" : ""}${v.toFixed(1)}%`;

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d, n) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

function sameMonth(dateStr, ref) {
  const d = new Date(dateStr + "T00:00:00");
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
}

function monthKey(dateStr) {
  return dateStr.slice(0, 7); // YYYY-MM
}

function monthLabel(key) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1)
    .toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })
    .replace(".", "");
}

/**
 * Agrupa receitas e despesas por mês para permitir a comparação
 * mês a mês exibida no onboarding e nos insights.
 */
function buildMonthlyComparison(transactions) {
  const byMonth = {};
  transactions.forEach((t) => {
    const key = monthKey(t.date);
    if (!byMonth[key]) byMonth[key] = { income: 0, expense: 0 };
    if (t.type === "receita") byMonth[key].income += t.amount;
    else byMonth[key].expense += t.amount;
  });
  return Object.entries(byMonth)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([key, v]) => ({
      key,
      label: monthLabel(key),
      income: v.income,
      expense: v.expense,
      balance: v.income - v.expense,
    }));
}

/**
 * Agrupa despesas por forma de pagamento (Pix, dinheiro, débito,
 * crédito, boleto...) para o resumo do onboarding.
 */
function buildPaymentBreakdown(transactions) {
  const byMethod = {};
  transactions
    .filter((t) => t.type === "despesa")
    .forEach((t) => {
      const key = PAYMENT_METHODS.includes(t.paymentMethod) ? t.paymentMethod : "Outros";
      byMethod[key] = (byMethod[key] || 0) + t.amount;
    });
  const total = Object.values(byMethod).reduce((a, b) => a + b, 0);
  return Object.entries(byMethod)
    .sort(([, a], [, b]) => b - a)
    .map(([method, value]) => ({ method, value, pct: total > 0 ? (value / total) * 100 : 0 }));
}

function reduceReducedMotion() {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = () => reject(new Error("Falha ao ler o arquivo."));
    reader.readAsDataURL(file);
  });
}

/**
 * Envia o PDF da fatura/conta para o modelo e pede de volta uma lista
 * estruturada de lançamentos (JSON puro). Todo o parsing acontece no
 * navegador; nenhum dado sai do fluxo além dessa chamada.
 */
async function extractTransactionsFromPDF(base64Data) {
  // Em produção (Vercel), esta rota roda em api/extract.js: a chave da API
  // fica no servidor (variável de ambiente ANTHROPIC_API_KEY), nunca no navegador.
  const response = await fetch("/api/extract", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ base64Data }),
  });

  if (!response.ok) {
    let message = "Não foi possível processar o PDF agora (erro " + response.status + ").";
    try {
      const errBody = await response.json();
      if (errBody?.error) message = errBody.error;
    } catch {}
    throw new Error(message);
  }

  const data = await response.json();
  const rawText = (data.content || []).map((block) => block.text || "").filter(Boolean).join("\n");
  const cleaned = rawText.replace(/```json|```/g, "").trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error("O documento foi lido, mas não foi possível interpretar os lançamentos.");
  }

  const list = Array.isArray(parsed?.transactions) ? parsed.transactions : [];

  return list
    .map((item) => {
      const amount = Number(item.amount);
      if (!Number.isFinite(amount) || amount <= 0) return null;
      const type = item.type === "receita" ? "receita" : "despesa";
      const categoryList = type === "receita" ? INCOME_CATEGORIES : CATEGORIES;
      const category = categoryList.includes(item.category) ? item.category : categoryList[categoryList.length - 1];
      const paymentMethod = PAYMENT_METHODS.includes(item.paymentMethod) ? item.paymentMethod : "Pix";
      const dateOk = typeof item.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(item.date);
      return {
        id: uid(),
        type,
        amount,
        description: String(item.description || "Lançamento importado").slice(0, 120).trim(),
        category,
        paymentMethod,
        date: dateOk ? item.date : isoDate(new Date()),
        isRecurring: false,
        notes: "",
        __imported: true,
      };
    })
    .filter(Boolean);
}

/* ------------------------------------------------------------------ */
/* Dados de demonstração — recentes, gerados relativos a hoje          */
/* ------------------------------------------------------------------ */
function generateDemoData() {
  const now = new Date();
  const rows = [];

  const expenseBase = {
    Faculdade: 620, Personal: 300, Psicóloga: 220, Supermercado: 650,
    Transporte: 280, Alimentação: 420, Saúde: 180, Lazer: 350,
    "Gastos gerais": 210, Diversão: 140, Investimentos: 500,
  };

  const paymentFor = (cat) => {
    if (cat === "Investimentos") return "Pix";
    if (["Supermercado", "Alimentação", "Lazer", "Diversão"].includes(cat)) return "Cartão de crédito";
    if (["Faculdade", "Personal", "Psicóloga"].includes(cat)) return "Pix";
    return "Cartão de débito";
  };

  for (let m = 3; m >= 0; m--) {
    const monthDate = addMonths(startOfMonth(now), -m);
    const variance = () => 0.85 + Math.random() * 0.3;

    rows.push({
      id: uid(), type: "receita", amount: Math.round(4800 * variance()),
      description: "Salário", category: "Salário", paymentMethod: "Pix",
      date: isoDate(new Date(monthDate.getFullYear(), monthDate.getMonth(), 5)),
      isRecurring: true, notes: "",
    });
    if (Math.random() > 0.35) {
      rows.push({
        id: uid(), type: "receita", amount: Math.round(650 * variance()),
        description: "Freelance", category: "Freelance", paymentMethod: "Pix",
        date: isoDate(new Date(monthDate.getFullYear(), monthDate.getMonth(), 18)),
        isRecurring: false, notes: "",
      });
    }

    Object.entries(expenseBase).forEach(([cat, base], idx) => {
      const day = 3 + ((idx * 3) % 26);
      rows.push({
        id: uid(), type: "despesa", amount: Math.round(base * variance()),
        description: cat, category: cat, paymentMethod: paymentFor(cat),
        date: isoDate(new Date(monthDate.getFullYear(), monthDate.getMonth(), day)),
        isRecurring: ["Faculdade", "Personal", "Psicóloga", "Investimentos"].includes(cat),
        notes: "",
      });
    });
  }
  return rows;
}

/* ------------------------------------------------------------------ */
/* Componentes pequenos                                                */
/* ------------------------------------------------------------------ */
function MetricCard({ label, value, delta, icon: Icon, accent }) {
  const positive = delta >= 0;
  return (
    <div
      className="rounded-2xl p-4 flex flex-col gap-2 min-w-0"
      style={{ background: C.surface, border: `1px solid ${C.divider}` }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs" style={{ color: C.textSoft }}>{label}</span>
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
          style={{ background: accent + "22" }}
        >
          <Icon size={14} style={{ color: accent }} />
        </div>
      </div>
      <div className="text-xl font-semibold tracking-tight truncate" style={{ color: C.text, fontVariantNumeric: "tabular-nums" }}>
        {money(value)}
      </div>
      {delta !== null && (
        <div className="flex items-center gap-1 text-xs" style={{ color: positive ? "#B9A6E0" : "#E0A6C4" }}>
          {positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          <span>{pct(delta)} vs mês anterior</span>
        </div>
      )}
    </div>
  );
}

function ChartCard({ title, right, children, className = "" }) {
  return (
    <div
      className={`rounded-2xl p-4 ${className}`}
      style={{ background: C.surface, border: `1px solid ${C.divider}` }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium" style={{ color: C.text }}>{title}</h3>
        {right}
      </div>
      {children}
    </div>
  );
}

function CircularGauge({ value, label, sub, size = 96 }) {
  const r = size / 2 - 8;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={C.divider} strokeWidth="8" />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke="url(#gaugeGrad)" strokeWidth="8" strokeLinecap="round"
          strokeDasharray={`${(clamped / 100) * c} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <defs>
          <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={C.lavender} />
            <stop offset="100%" stopColor={C.purple} />
          </linearGradient>
        </defs>
        <text x="50%" y="47%" textAnchor="middle" fill={C.text} fontSize="18" fontWeight="600">
          {Math.round(clamped)}%
        </text>
      </svg>
      <span className="text-xs text-center" style={{ color: C.textSoft }}>{label}</span>
      {sub && <span className="text-[11px]" style={{ color: C.textSoft }}>{sub}</span>}
    </div>
  );
}

function EmptyState({ onAdd, onSeed }) {
  return (
    <div
      className="rounded-2xl p-10 flex flex-col items-center text-center gap-3"
      style={{ background: C.surface, border: `1px solid ${C.divider}` }}
    >
      <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${C.lavender}, ${C.purpleDark})` }}>
        <Wallet size={20} color={C.text} />
      </div>
      <h2 className="text-base font-medium" style={{ color: C.text }}>Seu painel financeiro começa aqui.</h2>
      <p className="text-sm max-w-xs" style={{ color: C.textSoft }}>
        Adicione sua primeira movimentação para começarmos a analisar suas finanças.
      </p>
      <div className="flex gap-2 mt-2">
        <button onClick={onAdd} className="px-4 py-2 rounded-full text-sm font-medium" style={{ background: C.lavender, color: C.text }}>
          Adicionar movimentação
        </button>
        <button onClick={onSeed} className="px-4 py-2 rounded-full text-sm" style={{ border: `1px solid ${C.divider}`, color: C.textSoft }}>
          Carregar dados de exemplo
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Formulário (criar / editar / duplicar)                              */
/* ------------------------------------------------------------------ */
function TransactionForm({ initial, onCancel, onSave }) {
  const [type, setType] = useState(initial?.type || "despesa");
  const [amount, setAmount] = useState(initial?.amount ?? "");
  const [description, setDescription] = useState(initial?.description || "");
  const [category, setCategory] = useState(initial?.category || CATEGORIES[0]);
  const [paymentMethod, setPaymentMethod] = useState(initial?.paymentMethod || PAYMENT_METHODS[0]);
  const [date, setDate] = useState(initial?.date || isoDate(new Date()));
  const [isRecurring, setIsRecurring] = useState(initial?.isRecurring || false);
  const [notes, setNotes] = useState(initial?.notes || "");

  const categoryList = type === "receita" ? INCOME_CATEGORIES : CATEGORIES;

  useEffect(() => {
    if (!categoryList.includes(category)) setCategory(categoryList[0]);
    // eslint-disable-next-line
  }, [type]);

  const numericAmount = Number(amount);
  const canSave =
    amount !== "" &&
    Number.isFinite(numericAmount) &&
    numericAmount > 0 &&
    numericAmount <= 999999999 &&
    description.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: "rgba(5,3,8,0.6)", backdropFilter: "blur(3px)" }}>
      <div
        className="w-full sm:w-[420px] max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl p-5"
        style={{ background: C.surface2, border: `1px solid ${C.divider}` }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-medium" style={{ color: C.text }}>
            {initial?.id ? "Editar movimentação" : "Nova movimentação"}
          </h3>
          <button onClick={onCancel} aria-label="Fechar">
            <X size={18} style={{ color: C.textSoft }} />
          </button>
        </div>

        <div className="flex gap-2 mb-4">
          {["despesa", "receita"].map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className="flex-1 py-2 rounded-xl text-sm capitalize"
              style={{
                background: type === t ? `linear-gradient(135deg, ${C.lavender}, ${C.purpleDark})` : "transparent",
                color: type === t ? C.text : C.textSoft,
                border: `1px solid ${type === t ? "transparent" : C.divider}`,
              }}
            >
              {t}
            </button>
          ))}
        </div>

        <label htmlFor="tx-amount" className="block text-xs mb-1" style={{ color: C.textSoft }}>Valor</label>
        <input
          id="tx-amount"
          type="number" min="0" max="999999999" step="0.01" value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0,00"
          className="w-full mb-3 px-3 py-2 rounded-xl outline-none text-sm"
          style={{ background: C.bg2, color: C.text, border: `1px solid ${C.divider}` }}
        />

        <label htmlFor="tx-description" className="block text-xs mb-1" style={{ color: C.textSoft }}>Descrição</label>
        <input
          id="tx-description"
          type="text" value={description} onChange={(e) => setDescription(e.target.value)}
          placeholder="Ex: Supermercado da semana"
          maxLength={120}
          className="w-full mb-3 px-3 py-2 rounded-xl outline-none text-sm"
          style={{ background: C.bg2, color: C.text, border: `1px solid ${C.divider}` }}
        />

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label htmlFor="tx-category" className="block text-xs mb-1" style={{ color: C.textSoft }}>Categoria</label>
            <select
              id="tx-category"
              value={category} onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-xl outline-none text-sm"
              style={{ background: C.bg2, color: C.text, border: `1px solid ${C.divider}` }}
            >
              {categoryList.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="tx-payment" className="block text-xs mb-1" style={{ color: C.textSoft }}>Forma de pagamento</label>
            <select
              id="tx-payment"
              value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-3 py-2 rounded-xl outline-none text-sm"
              style={{ background: C.bg2, color: C.text, border: `1px solid ${C.divider}` }}
            >
              {PAYMENT_METHODS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>

        <label htmlFor="tx-date" className="block text-xs mb-1" style={{ color: C.textSoft }}>Data</label>
        <input
          id="tx-date"
          type="date" value={date} onChange={(e) => setDate(e.target.value)}
          className="w-full mb-3 px-3 py-2 rounded-xl outline-none text-sm"
          style={{ background: C.bg2, color: C.text, border: `1px solid ${C.divider}`, colorScheme: "dark" }}
        />

        <label htmlFor="tx-recurring" className="flex items-center gap-2 mb-3 text-sm" style={{ color: C.textSoft }}>
          <input id="tx-recurring" type="checkbox" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} />
          Lançamento recorrente (mensal)
        </label>

        <label htmlFor="tx-notes" className="block text-xs mb-1" style={{ color: C.textSoft }}>Notas (opcional)</label>
        <textarea
          id="tx-notes"
          value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
          maxLength={280}
          className="w-full mb-4 px-3 py-2 rounded-xl outline-none text-sm resize-none"
          style={{ background: C.bg2, color: C.text, border: `1px solid ${C.divider}` }}
        />

        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 py-2 rounded-xl text-sm" style={{ border: `1px solid ${C.divider}`, color: C.textSoft }}>
            Cancelar
          </button>
          <button
            disabled={!canSave}
            onClick={() => onSave({
              id: initial?.id && !initial.__duplicate ? initial.id : uid(),
              type, amount: numericAmount, description: description.trim(), category, paymentMethod, date, isRecurring,
              notes: notes.trim(),
            })}
            className="flex-1 py-2 rounded-xl text-sm font-medium"
            style={{
              background: canSave ? `linear-gradient(135deg, ${C.lavender}, ${C.purpleDark})` : C.divider,
              color: canSave ? C.text : C.textSoft,
            }}
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Linha de transação (tabela no desktop, card no mobile)              */
/* ------------------------------------------------------------------ */
function TransactionRow({ tx, onEdit, onDuplicate, onDelete, confirming, setConfirming }) {
  const isExpense = tx.type === "despesa";
  return (
    <div
      className="flex items-center gap-3 py-3 px-1 border-b last:border-b-0"
      style={{ borderColor: C.divider }}
    >
      <div
        className="w-2 h-2 rounded-full shrink-0"
        style={{ background: CATEGORY_COLORS[CATEGORIES.indexOf(tx.category) % CATEGORY_COLORS.length] || C.lavender }}
      />
      <div className="min-w-0 flex-1">
        <div className="text-sm truncate" style={{ color: C.text }}>{tx.description}</div>
        <div className="text-xs truncate" style={{ color: C.textSoft }}>
          {tx.category} • {tx.paymentMethod} • {new Date(tx.date + "T00:00:00").toLocaleDateString("pt-BR")}
        </div>
      </div>
      <div className="text-sm font-medium shrink-0" style={{ color: isExpense ? "#E0A6C4" : "#B9E0C8", fontVariantNumeric: "tabular-nums" }}>
        {isExpense ? "-" : "+"}{money(tx.amount)}
      </div>
      {confirming === tx.id ? (
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => onDelete(tx.id)} className="text-xs px-2 py-1 rounded-lg" style={{ background: "#7B337E33", color: "#E0A6C4" }}>Excluir</button>
          <button onClick={() => setConfirming(null)} className="text-xs px-2 py-1 rounded-lg" style={{ color: C.textSoft }}>Cancelar</button>
        </div>
      ) : (
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => onEdit(tx)} aria-label="Editar" className="p-1.5 rounded-lg hover:bg-white/5"><Pencil size={13} style={{ color: C.textSoft }} /></button>
          <button onClick={() => onDuplicate(tx)} aria-label="Duplicar" className="p-1.5 rounded-lg hover:bg-white/5"><Copy size={13} style={{ color: C.textSoft }} /></button>
          <button onClick={() => setConfirming(tx.id)} aria-label="Excluir" className="p-1.5 rounded-lg hover:bg-white/5"><Trash2 size={13} style={{ color: C.textSoft }} /></button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Onboarding — PDF da fatura + gastos extras                          */
/* ------------------------------------------------------------------ */
function OnboardingModal({ transactions, onAddTransactions, onFinish }) {
  const [step, setStep] = useState("pdf"); // pdf -> review -> manual -> summary
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [extracted, setExtracted] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [manualFormOpen, setManualFormOpen] = useState(false);
  const [addedCount, setAddedCount] = useState(0);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.type !== "application/pdf") {
      setError("Envie um arquivo em formato PDF.");
      return;
    }
    setError("");
    setIsLoading(true);
    try {
      const base64 = await fileToBase64(file);
      const list = await extractTransactionsFromPDF(base64);
      if (list.length === 0) {
        setError("Não encontrei lançamentos nesse PDF. Você pode tentar outro arquivo ou pular esta etapa.");
      } else {
        setExtracted(list);
        setSelected(new Set(list.map((t) => t.id)));
        setStep("review");
      }
    } catch (err) {
      setError(err?.message || "Não foi possível ler o PDF agora.");
    } finally {
      setIsLoading(false);
    }
  };

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const confirmImport = () => {
    const chosen = extracted.filter((t) => selected.has(t.id));
    if (chosen.length) onAddTransactions(chosen);
    setAddedCount(chosen.length);
    setStep("manual");
  };

  if (manualFormOpen) {
    return (
      <TransactionForm
        initial={null}
        onCancel={() => setManualFormOpen(false)}
        onSave={(tx) => {
          onAddTransactions([tx]);
          setAddedCount((n) => n + 1);
          setManualFormOpen(false);
        }}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: "rgba(5,3,8,0.7)", backdropFilter: "blur(3px)" }}>
      <div
        className="w-full sm:w-[440px] max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl p-6"
        style={{ background: C.surface2, border: `1px solid ${C.divider}` }}
      >
        {step === "pdf" && (
          <>
            <div className="w-11 h-11 rounded-full flex items-center justify-center mb-3" style={{ background: `linear-gradient(135deg, ${C.lavender}, ${C.purpleDark})` }}>
              <FileText size={19} color={C.text} />
            </div>
            <h2 className="text-base font-medium mb-1" style={{ color: C.text }}>Bem-vindo(a) ao Finance OS</h2>
            <p className="text-sm mb-4" style={{ color: C.textSoft }}>
              Envie o PDF de uma fatura de cartão, conta de consumo ou extrato para eu identificar os lançamentos automaticamente.
            </p>

            <label
              htmlFor="onboarding-pdf"
              className="flex flex-col items-center justify-center gap-2 rounded-2xl py-8 mb-3 cursor-pointer"
              style={{ border: `1px dashed ${C.divider}`, background: C.bg2 }}
            >
              {isLoading ? (
                <>
                  <Loader2 size={22} className="animate-spin" style={{ color: C.lavender }} />
                  <span className="text-xs" style={{ color: C.textSoft }}>Lendo o documento…</span>
                </>
              ) : (
                <>
                  <FileText size={22} style={{ color: C.textSoft }} />
                  <span className="text-xs text-center px-4" style={{ color: C.textSoft }}>
                    Toque para escolher um arquivo PDF
                  </span>
                </>
              )}
            </label>
            <input
              id="onboarding-pdf" type="file" accept="application/pdf" onChange={handleFile}
              disabled={isLoading} className="sr-only"
            />

            {error && (
              <div className="flex items-start gap-2 text-xs mb-3 p-2 rounded-xl" style={{ background: "#7B337E22", color: "#E0A6C4" }}>
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              onClick={() => setStep("manual")}
              disabled={isLoading}
              className="w-full py-2 rounded-xl text-sm"
              style={{ border: `1px solid ${C.divider}`, color: C.textSoft }}
            >
              Pular esta etapa
            </button>
          </>
        )}

        {step === "review" && (
          <>
            <div className="w-11 h-11 rounded-full flex items-center justify-center mb-3" style={{ background: `linear-gradient(135deg, ${C.lavender}, ${C.purpleDark})` }}>
              <CheckCircle2 size={19} color={C.text} />
            </div>
            <h2 className="text-base font-medium mb-1" style={{ color: C.text }}>
              Encontrei {extracted.length} lançamento{extracted.length === 1 ? "" : "s"}
            </h2>
            <p className="text-sm mb-3" style={{ color: C.textSoft }}>
              Confira e desmarque o que não quiser importar.
            </p>
            <div className="flex flex-col gap-1 mb-4 max-h-72 overflow-y-auto pfos-scroll">
              {extracted.map((tx) => (
                <label
                  key={tx.id}
                  className="flex items-center gap-2 py-2 px-2 rounded-xl text-sm cursor-pointer"
                  style={{ background: C.bg2 }}
                >
                  <input type="checkbox" checked={selected.has(tx.id)} onChange={() => toggle(tx.id)} />
                  <span className="flex-1 min-w-0 truncate" style={{ color: C.text }}>{tx.description}</span>
                  <span className="text-xs shrink-0" style={{ color: C.textSoft }}>
                    {tx.category} · {tx.paymentMethod}
                  </span>
                  <span className="text-xs font-medium shrink-0" style={{ color: tx.type === "despesa" ? "#E0A6C4" : "#B9E0C8" }}>
                    {tx.type === "despesa" ? "-" : "+"}{money(tx.amount)}
                  </span>
                </label>
              ))}
            </div>
            <button
              onClick={confirmImport}
              className="w-full py-2 rounded-xl text-sm font-medium"
              style={{ background: `linear-gradient(135deg, ${C.lavender}, ${C.purpleDark})`, color: C.text }}
            >
              Adicionar {selected.size} lançamento{selected.size === 1 ? "" : "s"}
            </button>
          </>
        )}

        {step === "manual" && (
          <>
            <div className="w-11 h-11 rounded-full flex items-center justify-center mb-3" style={{ background: `linear-gradient(135deg, ${C.lavender}, ${C.purpleDark})` }}>
              <Banknote size={19} color={C.text} />
            </div>
            <h2 className="text-base font-medium mb-1" style={{ color: C.text }}>
              {addedCount > 0 ? `${addedCount} lançamento${addedCount === 1 ? "" : "s"} adicionado${addedCount === 1 ? "" : "s"}.` : "Tem mais algum gasto?"}
            </h2>
            <p className="text-sm mb-4" style={{ color: C.textSoft }}>
              Tem mais algum outro gasto que queira adicionar — Pix, dinheiro, débito, boleto ou crédito?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setStep("summary")}
                className="flex-1 py-2 rounded-xl text-sm"
                style={{ border: `1px solid ${C.divider}`, color: C.textSoft }}
              >
                Não, concluir
              </button>
              <button
                onClick={() => setManualFormOpen(true)}
                className="flex-1 py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5"
                style={{ background: `linear-gradient(135deg, ${C.lavender}, ${C.purpleDark})`, color: C.text }}
              >
                Sim, adicionar <ArrowRight size={14} />
              </button>
            </div>
          </>
        )}

        {step === "summary" && (() => {
          const monthly = buildMonthlyComparison(transactions);
          const byPayment = buildPaymentBreakdown(transactions);
          return (
            <>
              <div className="w-11 h-11 rounded-full flex items-center justify-center mb-3" style={{ background: `linear-gradient(135deg, ${C.lavender}, ${C.purpleDark})` }}>
                <BarChart3 size={19} color={C.text} />
              </div>
              <h2 className="text-base font-medium mb-1" style={{ color: C.text }}>
                Comparativo dos seus meses
              </h2>
              <p className="text-sm mb-4" style={{ color: C.textSoft }}>
                Veja como ganhos e gastos se comportaram mês a mês, e como você costuma pagar.
              </p>

              {monthly.length === 0 ? (
                <p className="text-xs mb-4 p-3 rounded-xl" style={{ background: C.bg2, color: C.textSoft }}>
                  Ainda não há lançamentos suficientes para comparar meses. Você pode adicionar mais depois.
                </p>
              ) : (
                <div className="flex flex-col gap-2 mb-4 max-h-56 overflow-y-auto pfos-scroll">
                  {monthly.map((m, i) => {
                    const prev = monthly[i - 1];
                    const change = prev && prev.expense > 0 ? ((m.expense - prev.expense) / prev.expense) * 100 : null;
                    return (
                      <div key={m.key} className="rounded-xl px-3 py-2" style={{ background: C.bg2 }}>
                        <div className="flex items-center justify-between text-sm mb-1" style={{ color: C.text }}>
                          <span className="capitalize font-medium">{m.label}</span>
                          <span style={{ color: m.balance >= 0 ? "#B9E0C8" : "#E0A6C4" }}>{money(m.balance)}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs" style={{ color: C.textSoft }}>
                          <span>Receitas {money(m.income)}</span>
                          <span>Gastos {money(m.expense)}</span>
                        </div>
                        {change !== null && (
                          <div className="flex items-center gap-1 text-xs mt-1" style={{ color: change > 0 ? "#E0A6C4" : "#B9A6E0" }}>
                            {change > 0 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                            <span>Gastos {pct(change)} vs {prev.label}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {byPayment.length > 0 && (
                <>
                  <h3 className="text-xs font-medium mb-2" style={{ color: C.textSoft }}>Como você costuma pagar</h3>
                  <div className="flex flex-col gap-2 mb-5">
                    {byPayment.map(({ method, value, pct: p }) => (
                      <div key={method}>
                        <div className="flex justify-between text-xs mb-1" style={{ color: C.textSoft }}>
                          <span>{method}</span><span>{money(value)}</span>
                        </div>
                        <div className="h-1.5 rounded-full" style={{ background: C.divider }}>
                          <div
                            className="h-1.5 rounded-full"
                            style={{ width: `${p}%`, background: C.lavender }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <button
                onClick={onFinish}
                className="w-full py-2 rounded-xl text-sm font-medium"
                style={{ background: `linear-gradient(135deg, ${C.lavender}, ${C.purpleDark})`, color: C.text }}
              >
                Concluir e ver meu painel
              </button>
            </>
          );
        })()}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* App                                                                 */
/* ------------------------------------------------------------------ */
export default function PersonalFinanceOS() {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [formState, setFormState] = useState(null); // null | {} | tx
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [confirming, setConfirming] = useState(null);
  const [search, setSearch] = useState("");
  const [chartPeriod, setChartPeriod] = useState("30d");
  const [tiltStyle, setTiltStyle] = useState({});
  const reducedMotion = useRef(reduceReducedMotion());
  const now = new Date();
  const thisMonth = startOfMonth(now);
  const prevMonth = addMonths(thisMonth, -1);

  useEffect(() => {
    (async () => {
      let onboarded = false;
      try {
        const ob = await storage.get(ONBOARDING_KEY);
        onboarded = ob?.value === "true";
      } catch {}

      try {
        const res = await storage.get(STORAGE_KEY);
        const parsed = res?.value ? JSON.parse(res.value) : null;
        if (parsed && parsed.length) {
          setTransactions(parsed);
          if (!onboarded) setShowOnboarding(true);
        } else if (onboarded) {
          // usuário já passou pelo onboarding antes; carrega dados de exemplo
          const demo = generateDemoData();
          setTransactions(demo);
          await storage.set(STORAGE_KEY, JSON.stringify(demo));
        } else {
          // primeiro acesso: pede o PDF das contas e outros gastos
          setTransactions([]);
          setShowOnboarding(true);
        }
      } catch {
        setTransactions([]);
        setShowOnboarding(true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const persist = async (next) => {
    setTransactions(next);
    try { await storage.set(STORAGE_KEY, JSON.stringify(next)); } catch {}
  };

  const handleOnboardingAddTransactions = (list) => {
    persist([...list, ...transactions]);
  };

  const handleOnboardingFinish = async () => {
    setShowOnboarding(false);
    try { await storage.set(ONBOARDING_KEY, "true"); } catch {}
  };

  const handleSave = (tx) => {
    const exists = transactions.some((t) => t.id === tx.id);
    const next = exists ? transactions.map((t) => (t.id === tx.id ? tx : t)) : [tx, ...transactions];
    persist(next);
    setFormState(null);
  };
  const handleDelete = (id) => {
    persist(transactions.filter((t) => t.id !== id));
    setConfirming(null);
  };
  const handleDuplicate = (tx) => {
    setFormState({ ...tx, date: isoDate(new Date()), __duplicate: true });
  };
  const handleSeed = () => persist(generateDemoData());

  /* ---- métricas derivadas ---- */
  const metrics = useMemo(() => {
    const inMonth = (ref) => transactions.filter((t) => sameMonth(t.date, ref));
    const sum = (arr, type) => arr.filter((t) => t.type === type).reduce((s, t) => s + t.amount, 0);

    const cur = inMonth(thisMonth);
    const prev = inMonth(prevMonth);

    const income = sum(cur, "receita");
    const expense = sum(cur, "despesa");
    const balance = income - expense;
    const investAmount = cur.filter((t) => t.category === "Investimentos").reduce((s, t) => s + t.amount, 0);
    const savingsRate = income > 0 ? (balance / income) * 100 : 0;

    const prevIncome = sum(prev, "receita");
    const prevExpense = sum(prev, "despesa");
    const prevBalance = prevIncome - prevExpense;
    const prevInvest = prev.filter((t) => t.category === "Investimentos").reduce((s, t) => s + t.amount, 0);
    const prevSavingsRate = prevIncome > 0 ? (prevBalance / prevIncome) * 100 : 0;

    const delta = (a, b) => (b === 0 ? 0 : ((a - b) / Math.abs(b)) * 100);

    // categorias
    const byCategory = {};
    cur.filter((t) => t.type === "despesa").forEach((t) => {
      byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
    });
    const byCategoryPrev = {};
    prev.filter((t) => t.type === "despesa").forEach((t) => {
      byCategoryPrev[t.category] = (byCategoryPrev[t.category] || 0) + t.amount;
    });
    const categoryData = Object.entries(byCategory)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // pix x cartão
    const byPayment = { Pix: 0, Cartão: 0, Outros: 0 };
    cur.filter((t) => t.type === "despesa").forEach((t) => {
      if (t.paymentMethod === "Pix") byPayment.Pix += t.amount;
      else if (t.paymentMethod.startsWith("Cartão")) byPayment.Cartão += t.amount;
      else byPayment.Outros += t.amount;
    });

    // insights
    const insights = [];
    let biggestUp = null, biggestDown = null;
    Object.keys(byCategory).forEach((cat) => {
      const prevVal = byCategoryPrev[cat] || 0;
      if (prevVal > 0) {
        const change = delta(byCategory[cat], prevVal);
        if (change > 8 && (!biggestUp || change > biggestUp.change)) biggestUp = { cat, change };
        if (change < -8 && (!biggestDown || change < biggestDown.change)) biggestDown = { cat, change };
      }
    });
    if (biggestUp) insights.push(`${biggestUp.cat} subiu ${biggestUp.change.toFixed(0)}% em relação ao mês passado.`);
    if (biggestDown) insights.push(`${biggestDown.cat} caiu ${Math.abs(biggestDown.change).toFixed(0)}% em relação ao mês passado.`);
    if (expense > 0) insights.push(`Cartão representa ${((byPayment.Cartão / expense) * 100).toFixed(0)}% das despesas deste mês.`);

    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const projected = dayOfMonth > 0 ? (expense / dayOfMonth) * daysInMonth : expense;
    insights.push(`Mantendo o ritmo atual, sua projeção de gastos até o fim do mês é de ${money(projected)}.`);
    insights.push(`Sua taxa de economia este mês é de ${savingsRate.toFixed(0)}%.`);

    // orçamento estimado (média dos últimos meses com dados)
    const monthsWithData = [1, 2, 3].map((n) => sum(inMonth(addMonths(thisMonth, -n)), "despesa")).filter((v) => v > 0);
    const estimatedBudget = monthsWithData.length ? monthsWithData.reduce((a, b) => a + b, 0) / monthsWithData.length : Math.max(expense, income * 0.7);

    return {
      income, expense, balance, investAmount, savingsRate,
      incomeDelta: delta(income, prevIncome),
      expenseDelta: delta(expense, prevExpense),
      balanceDelta: delta(balance, prevBalance),
      savingsRateDelta: delta(savingsRate, prevSavingsRate),
      categoryData, byPayment, insights, projected, estimatedBudget,
    };
  }, [transactions, thisMonth.getTime(), prevMonth.getTime()]);

  /* ---- dados do gráfico principal ---- */
  const chartData = useMemo(() => {
    const days = { "7d": 7, "30d": 30 }[chartPeriod];
    const months = { "3m": 3, "6m": 6, "12m": 12 }[chartPeriod];

    if (days) {
      const buckets = [];
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const key = isoDate(d);
        const dayTx = transactions.filter((t) => t.date === key);
        buckets.push({
          label: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
          receitas: dayTx.filter((t) => t.type === "receita").reduce((s, t) => s + t.amount, 0),
          despesas: dayTx.filter((t) => t.type === "despesa").reduce((s, t) => s + t.amount, 0),
        });
      }
      return buckets.map((b) => ({ ...b, saldo: b.receitas - b.despesas }));
    }
    const n = months || 3;
    const buckets = [];
    for (let i = n - 1; i >= 0; i--) {
      const ref = addMonths(thisMonth, -i);
      const monthTx = transactions.filter((t) => sameMonth(t.date, ref));
      buckets.push({
        label: ref.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
        receitas: monthTx.filter((t) => t.type === "receita").reduce((s, t) => s + t.amount, 0),
        despesas: monthTx.filter((t) => t.type === "despesa").reduce((s, t) => s + t.amount, 0),
      });
    }
    return buckets.map((b) => ({ ...b, saldo: b.receitas - b.despesas }));
  }, [transactions, chartPeriod]);

  const filteredTx = useMemo(() => {
    return transactions
      .filter((t) => t.description.toLowerCase().includes(search.toLowerCase()) || t.category.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, 8);
  }, [transactions, search]);

  const budgetPct = metrics.estimatedBudget > 0 ? (metrics.expense / metrics.estimatedBudget) * 100 : 0;

  const handleMouseMove = (e) => {
    if (reducedMotion.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTiltStyle({ transform: `perspective(600px) rotateX(${y * -4}deg) rotateY(${x * 4}deg)` });
  };
  const handleMouseLeave = () => setTiltStyle({ transform: "perspective(600px) rotateX(0) rotateY(0)" });

  if (loading) {
    return (
      <div className="w-full min-h-[600px] flex items-center justify-center" style={{ background: C.bg }}>
        <div className="text-sm animate-pulse" style={{ color: C.textSoft }}>Carregando seu painel…</div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-[700px] flex" style={{ background: C.bg, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        @keyframes pfos-orbit { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .pfos-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
        .pfos-scroll::-webkit-scrollbar-thumb { background: ${C.divider}; border-radius: 3px; }
      `}</style>

      {/* Sidebar desktop */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 p-4 gap-1" style={{ borderRight: `1px solid ${C.divider}` }}>
        <div className="flex items-center gap-2 px-2 mb-6">
          <div className="w-7 h-7 rounded-lg" style={{ background: `linear-gradient(135deg, ${C.lavender}, ${C.purpleDark})` }} />
          <span className="text-sm font-semibold" style={{ color: C.text }}>Finance OS</span>
        </div>
        {[
          { icon: Home, label: "Visão geral", active: true },
          { icon: ListTree, label: "Movimentações" },
          { icon: BarChart3, label: "Análises" },
          { icon: MoreHorizontal, label: "Mais" },
        ].map(({ icon: Icon, label, active }) => (
          <button
            key={label}
            type="button"
            aria-current={active ? "page" : undefined}
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-left"
            style={{ background: active ? C.surface : "transparent", color: active ? C.text : C.textSoft }}
          >
            <Icon size={16} />{label}
          </button>
        ))}
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 pb-24 md:pb-8 px-4 md:px-8 pt-6 overflow-y-auto pfos-scroll">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-xs" style={{ color: C.textSoft }}>Bom dia</p>
            <h1 className="text-lg font-semibold" style={{ color: C.text }}>
              {now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
            </h1>
          </div>
          <button
            onClick={() => setFormState({})}
            className="hidden md:flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium"
            style={{ background: `linear-gradient(135deg, ${C.lavender}, ${C.purpleDark})`, color: C.text }}
          >
            <Plus size={15} /> Adicionar
          </button>
        </div>

        {transactions.length === 0 ? (
          <EmptyState onAdd={() => setFormState({})} onSeed={handleSeed} />
        ) : (
          <>
            {/* Saldo em destaque */}
            <div
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              className="relative overflow-hidden rounded-2xl p-6 mb-4"
              style={{
                background: `linear-gradient(135deg, ${C.purpleDeep} 0%, ${C.purpleDark} 45%, ${C.purple} 100%)`,
                border: `1px solid ${C.divider}`,
                transition: "transform 0.15s ease-out",
                ...tiltStyle,
              }}
            >
              <div
                className="absolute -right-10 -top-10 w-52 h-52 rounded-full opacity-30 pointer-events-none"
                style={{
                  border: `1px solid ${C.pink}55`,
                  animation: reducedMotion.current ? "none" : "pfos-orbit 40s linear infinite",
                }}
              />
              <div
                className="absolute -right-4 top-4 w-32 h-32 rounded-full opacity-20 pointer-events-none"
                style={{
                  border: `1px solid ${C.pink}55`,
                  animation: reducedMotion.current ? "none" : "pfos-orbit 25s linear infinite reverse",
                }}
              />
              <p className="text-xs relative z-10" style={{ color: "#E7DEF0" }}>Saldo disponível</p>
              <p className="text-3xl font-semibold mt-1 relative z-10" style={{ color: "#FFFFFF", fontVariantNumeric: "tabular-nums" }}>
                {money(metrics.balance)}
              </p>
              <p className="text-xs mt-2 relative z-10" style={{ color: "#E7DEF0" }}>
                {pct(metrics.balanceDelta)} comparado ao mês anterior
              </p>
            </div>

            {/* Cards de métrica */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              <MetricCard label="Receita do mês" value={metrics.income} delta={metrics.incomeDelta} icon={TrendingUp} accent="#B9E0C8" />
              <MetricCard label="Gastos" value={metrics.expense} delta={-metrics.expenseDelta} icon={TrendingDown} accent="#E0A6C4" />
              <MetricCard label="Investimentos" value={metrics.investAmount} delta={null} icon={PiggyBank} accent={C.lavender} />
              <MetricCard label="Economia" value={metrics.balance > 0 ? metrics.balance : 0} delta={metrics.savingsRateDelta} icon={Wallet} accent={C.pink} />
            </div>

            {/* Fluxo + Categorias */}
            <div className="grid lg:grid-cols-3 gap-3 mb-4">
              <ChartCard
                className="lg:col-span-2"
                title="Receitas x despesas"
                right={
                  <select
                    value={chartPeriod} onChange={(e) => setChartPeriod(e.target.value)}
                    className="text-xs rounded-lg px-2 py-1 outline-none"
                    style={{ background: C.bg2, color: C.textSoft, border: `1px solid ${C.divider}` }}
                  >
                    <option value="7d">7 dias</option>
                    <option value="30d">30 dias</option>
                    <option value="3m">3 meses</option>
                    <option value="6m">6 meses</option>
                    <option value="12m">12 meses</option>
                  </select>
                }
              >
                <div style={{ width: "100%", height: 220 }}>
                  <ResponsiveContainer>
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="gReceita" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={C.lavender} stopOpacity={0.5} />
                          <stop offset="100%" stopColor={C.lavender} stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gDespesa" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={C.purple} stopOpacity={0.5} />
                          <stop offset="100%" stopColor={C.purple} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke={C.divider} vertical={false} />
                      <XAxis dataKey="label" tick={{ fill: C.textSoft, fontSize: 11 }} axisLine={{ stroke: C.divider }} tickLine={false} />
                      <YAxis tick={{ fill: C.textSoft, fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
                      <Tooltip
                        contentStyle={{ background: C.surface2, border: `1px solid ${C.divider}`, borderRadius: 12, fontSize: 12 }}
                        labelStyle={{ color: C.text }}
                        formatter={(v, name) => [money(v), name === "receitas" ? "Receitas" : name === "despesas" ? "Despesas" : "Saldo"]}
                      />
                      <Area type="monotone" dataKey="receitas" stroke={C.lavender} fill="url(#gReceita)" strokeWidth={2} />
                      <Area type="monotone" dataKey="despesas" stroke={C.purple} fill="url(#gDespesa)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>

              <ChartCard title="Gastos por categoria">
                <div style={{ width: "100%", height: 220 }} className="relative">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={metrics.categoryData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={2}>
                        {metrics.categoryData.map((entry, i) => (
                          <Cell key={entry.name} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} stroke="none" />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: C.surface2, border: `1px solid ${C.divider}`, borderRadius: 12, fontSize: 12 }}
                        formatter={(v, n) => [money(v), n]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xs" style={{ color: C.textSoft }}>Total</span>
                    <span className="text-sm font-semibold" style={{ color: C.text }}>{money(metrics.expense)}</span>
                  </div>
                </div>
              </ChartCard>
            </div>

            {/* Orçamento + PIX x cartão + Insights */}
            <div className="grid lg:grid-cols-3 gap-3 mb-4">
              <ChartCard title="Orçamento estimado do mês">
                <div className="flex items-center gap-4">
                  <CircularGauge value={budgetPct} label="do orçamento usado" size={90} />
                  <div className="text-xs" style={{ color: C.textSoft }}>
                    <p>{money(metrics.expense)} de {money(metrics.estimatedBudget)}</p>
                    <p className="mt-1">Estimado com base na média dos últimos meses.</p>
                  </div>
                </div>
              </ChartCard>

              <ChartCard title="Pix x cartão">
                <div className="flex flex-col gap-2">
                  {Object.entries(metrics.byPayment).filter(([, v]) => v > 0).map(([label, value], i) => (
                    <div key={label}>
                      <div className="flex justify-between text-xs mb-1" style={{ color: C.textSoft }}>
                        <span>{label}</span><span>{money(value)}</span>
                      </div>
                      <div className="h-1.5 rounded-full" style={{ background: C.divider }}>
                        <div
                          className="h-1.5 rounded-full"
                          style={{
                            width: `${metrics.expense > 0 ? (value / metrics.expense) * 100 : 0}%`,
                            background: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </ChartCard>

              <ChartCard title="Insights">
                <div className="flex flex-col gap-2.5">
                  {metrics.insights.slice(0, 3).map((text, i) => (
                    <div key={i} className="flex gap-2 text-xs items-start" style={{ color: C.textSoft }}>
                      <Sparkles size={13} className="shrink-0 mt-0.5" style={{ color: C.pink }} />
                      <span>{text}</span>
                    </div>
                  ))}
                </div>
              </ChartCard>
            </div>

            {/* Últimas movimentações */}
            <ChartCard
              title="Últimas movimentações"
              right={
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ background: C.bg2, border: `1px solid ${C.divider}` }}>
                  <Search size={13} style={{ color: C.textSoft }} />
                  <input
                    value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar"
                    aria-label="Buscar movimentações"
                    className="bg-transparent outline-none text-xs w-24"
                    style={{ color: C.text }}
                  />
                </div>
              }
            >
              <div>
                {filteredTx.length === 0 ? (
                  <p className="text-xs py-4 text-center" style={{ color: C.textSoft }}>Nenhuma movimentação encontrada.</p>
                ) : (
                  filteredTx.map((tx) => (
                    <TransactionRow
                      key={tx.id} tx={tx}
                      onEdit={setFormState} onDuplicate={handleDuplicate} onDelete={handleDelete}
                      confirming={confirming} setConfirming={setConfirming}
                    />
                  ))
                )}
              </div>
            </ChartCard>
          </>
        )}
      </main>

      {/* Bottom nav mobile */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 flex items-center justify-around py-2 px-2"
        style={{ background: C.surface2, borderTop: `1px solid ${C.divider}` }}
      >
        {[
          { icon: Home, label: "Início" },
          { icon: ListTree, label: "Mov." },
        ].map(({ icon: Icon, label }) => (
          <button key={label} type="button" className="flex flex-col items-center gap-0.5 text-[10px]" style={{ color: C.textSoft }}>
            <Icon size={18} /> {label}
          </button>
        ))}
        <button
          onClick={() => setFormState({})}
          aria-label="Adicionar movimentação"
          className="w-12 h-12 -mt-6 rounded-full flex items-center justify-center"
          style={{ background: `linear-gradient(135deg, ${C.lavender}, ${C.purpleDark})`, boxShadow: `0 4px 16px ${C.purple}66` }}
        >
          <Plus size={22} color="#fff" />
        </button>
        {[
          { icon: BarChart3, label: "Análises" },
          { icon: MoreHorizontal, label: "Mais" },
        ].map(({ icon: Icon, label }) => (
          <button key={label} type="button" className="flex flex-col items-center gap-0.5 text-[10px]" style={{ color: C.textSoft }}>
            <Icon size={18} /> {label}
          </button>
        ))}
      </nav>

      {formState !== null && (
        <TransactionForm
          initial={formState.id ? formState : null}
          onCancel={() => setFormState(null)}
          onSave={handleSave}
        />
      )}

      {showOnboarding && (
        <OnboardingModal
          transactions={transactions}
          onAddTransactions={handleOnboardingAddTransactions}
          onFinish={handleOnboardingFinish}
        />
      )}
    </div>
  );
}
