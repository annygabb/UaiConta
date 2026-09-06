import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, Banknote, CircleDollarSign, FileText, PiggyBank, ReceiptText, X } from "lucide-react";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, INVESTMENT_CATEGORIES, PAYMENT_METHODS, TRANSACTION_TYPES } from "../constants.js";
import { currencyInput, isoDate, parseCurrencyInput, uid } from "../utils.js";

const TYPE_META = {
  despesa: { icon: ReceiptText, description: "Compra, conta ou gasto" },
  receita: { icon: Banknote, description: "Salário ou entrada" },
  investimento: { icon: PiggyBank, description: "Aporte financeiro" },
  transferencia: { icon: ArrowLeftRight, description: "Entre suas contas" },
};

function categoriesFor(type) {
  if (type === "receita") return INCOME_CATEGORIES;
  if (type === "investimento") return INVESTMENT_CATEGORIES;
  if (type === "transferencia") return ["Transferência entre contas"];
  return EXPENSE_CATEGORIES;
}

export default function TransactionForm({ initial, onCancel, onSave, onImportPdf }) {
  const editing = Boolean(initial?.id && !initial?.__duplicate);
  const [type, setType] = useState(initial?.type || "despesa");
  const [amountText, setAmountText] = useState(initial?.amount ? currencyInput(initial.amount) : "");
  const [description, setDescription] = useState(initial?.description || "");
  const [category, setCategory] = useState(initial?.category || categoriesFor(initial?.type || "despesa")[0]);
  const [paymentMethod, setPaymentMethod] = useState(initial?.paymentMethod || "Pix");
  const [date, setDate] = useState(initial?.date || isoDate(new Date()));
  const [isRecurring, setIsRecurring] = useState(Boolean(initial?.isRecurring));
  const [notes, setNotes] = useState(initial?.notes || "");
  const [saving, setSaving] = useState(false);
  const amount = parseCurrencyInput(amountText);
  const categories = useMemo(() => categoriesFor(type), [type]);

  useEffect(() => {
    if (!categories.includes(category)) setCategory(categories[0]);
  }, [categories, category]);

  const canSave = amount > 0 && amount <= 999999999 && description.trim().length > 0 && date;
  const hasChanges = amountText || description || notes || initial;

  function requestCancel() {
    if (hasChanges && !editing && (amountText || description || notes)) {
      const ok = window.confirm("Descartar esta movimentação?");
      if (!ok) return;
    }
    onCancel();
  }

  function requestImportPdf() {
    if ((amountText || description || notes) && !window.confirm("Abrir a importação por PDF e descartar os campos atuais?")) return;
    onCancel();
    onImportPdf?.();
  }

  async function submit() {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      await onSave({
        id: editing ? initial.id : uid(),
        type,
        amount,
        description: description.trim(),
        category,
        paymentMethod: type === "transferencia" ? "Transferência" : paymentMethod,
        date,
        isRecurring,
        notes: notes.trim(),
        source: initial?.source || "manual",
        sourceFile: initial?.sourceFile || "",
        confidence: initial?.confidence || "alta",
        __imported: Boolean(initial?.__imported),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && requestCancel()}>
      <div className="transaction-sheet" role="dialog" aria-modal="true" aria-labelledby="transaction-title">
        <header className="sheet-header">
          <div>
            <span className="eyebrow">Movimentação</span>
            <h2 id="transaction-title">{editing ? "Editar lançamento" : "Adicionar item"}</h2>
          </div>
          <button className="icon-btn" onClick={requestCancel} aria-label="Fechar"><X size={19} /></button>
        </header>

        {!editing && onImportPdf && (
          <button type="button" className="pdf-shortcut" onClick={requestImportPdf}>
            <span><FileText size={17} /></span>
            <div><strong>Adicionar por PDF</strong><small>Importe vários PDFs, revise e confirme os lançamentos.</small></div>
          </button>
        )}

        <div className="type-grid" aria-label="Tipo de movimentação">
          {TRANSACTION_TYPES.map(({ value, label }) => {
            const Icon = TYPE_META[value].icon;
            return (
              <button key={value} type="button" className={type === value ? "type-option active" : "type-option"} onClick={() => setType(value)}>
                <span><Icon size={18} /></span>
                <strong>{label}</strong>
                <small>{TYPE_META[value].description}</small>
              </button>
            );
          })}
        </div>

        <section className="amount-stage">
          <label htmlFor="tx-amount">Valor</label>
          <div className="amount-input-wrap">
            <span>R$</span>
            <input
              id="tx-amount"
              inputMode="numeric"
              autoFocus
              value={amountText}
              onChange={(event) => setAmountText(currencyInput(parseCurrencyInput(event.target.value)))}
              onFocus={(event) => event.target.select()}
              placeholder="0,00"
              aria-describedby="amount-hint"
            />
          </div>
          <small id="amount-hint">Use o valor total da movimentação.</small>
        </section>

        <div className="form-grid">
          <label className="field field-span-2">
            <span>{type === "receita" ? "Origem da receita" : type === "investimento" ? "Descrição do aporte" : "Descrição"}</span>
            <input value={description} onChange={(event) => setDescription(event.target.value)} maxLength={140} placeholder={type === "receita" ? "Ex: Salário NTT DATA" : "Ex: Supermercado da semana"} />
          </label>

          <label className="field">
            <span>Categoria</span>
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              {categories.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>

          {type !== "transferencia" && (
            <label className="field">
              <span>{type === "receita" ? "Forma de recebimento" : "Forma de pagamento"}</span>
              <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
                {PAYMENT_METHODS.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
          )}

          <label className="field">
            <span>Data</span>
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </label>

          <label className="toggle-field">
            <input type="checkbox" checked={isRecurring} onChange={(event) => setIsRecurring(event.target.checked)} />
            <span className="toggle-ui" aria-hidden="true" />
            <span><strong>Recorrente</strong><small>Repete mensalmente</small></span>
          </label>

          <label className="field field-span-2">
            <span>Observação <em>opcional</em></span>
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows="3" maxLength={320} placeholder="Detalhes que podem ajudar você depois" />
          </label>
        </div>

        <footer className="sheet-footer">
          <button type="button" className="ghost-btn" onClick={requestCancel}>Cancelar</button>
          <button type="button" className="primary-btn" disabled={!canSave || saving} onClick={submit}>
            <CircleDollarSign size={17} /> {saving ? "Salvando..." : editing ? "Salvar alterações" : "Adicionar movimentação"}
          </button>
        </footer>
      </div>
    </div>
  );
}
