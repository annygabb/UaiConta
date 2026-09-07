import React, { useEffect, useMemo, useState } from 'react'
import { IconCreditCard, IconPlus, IconQrcode, IconTrash, IconX } from '@tabler/icons-react'
import { entityRepository } from '../../features/settings/entity.repository.ts'
import { transactionRepository } from '../../features/transactions/transaction.repository.ts'
import { isSupabaseConfigured } from '../../infrastructure/supabase/client.ts'
import { reaisToCents } from '../../domain/money/money.ts'
import PaymentFolder from '../../components/ui/PaymentFolder.jsx'
import SelectField from '../../components/ui/SelectField.jsx'

const emptyForm = { name: '', bank: '', limit: '', closingDay: '', dueDay: '' }
const dayOptions = [{ value: '__none__', label: 'Não informar' }, ...Array.from({ length: 31 }, (_, index) => ({ value: String(index + 1), label: `Dia ${index + 1}` }))]

function currentMonthKey() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export default function CardsPage() {
  const [cards, setCards] = useState([])
  const [transactions, setTransactions] = useState([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function reload() {
    if (!isSupabaseConfigured) { setLoading(false); return }
    setLoading(true)
    setError('')
    try {
      const [cardRows, txRows] = await Promise.all([entityRepository.list('credit_cards'), transactionRepository.list()])
      setCards(cardRows)
      setTransactions(txRows)
    } catch (err) { setError(err?.message || 'Não foi possível carregar seus cartões.') }
    finally { setLoading(false) }
  }

  useEffect(() => { reload() }, [])

  const summary = useMemo(() => {
    const month = currentMonthKey()
    const expenses = transactions.filter((row) => row.type === 'despesa' && row.status === 'completed' && String(row.date).startsWith(month))
    const sum = (rows) => rows.reduce((total, row) => total + Number(row.amountCents || Math.round(Number(row.amount || 0) * 100)), 0)
    const pix = sum(expenses.filter((row) => row.paymentMethod === 'Pix'))
    const cardData = cards.map((card) => {
      const rows = expenses.filter((row) => row.creditCardId === card.id)
      const credit = sum(rows.filter((row) => row.paymentMethod === 'Cartão de crédito'))
      const debit = sum(rows.filter((row) => row.paymentMethod === 'Cartão de débito'))
      return { card, credit, debit, total: credit + debit }
    })
    return { pix, cardData }
  }, [cards, transactions])

  async function save(event) {
    event.preventDefault()
    const name = form.name.trim()
    if (!name || saving) return
    const closingDay = form.closingDay === '' ? null : Number(form.closingDay)
    const dueDay = form.dueDay === '' ? null : Number(form.dueDay)
    setSaving(true)
    setError('')
    try {
      await entityRepository.create('credit_cards', {
        name,
        bank: form.bank.trim() || null,
        credit_limit_cents: form.limit ? reaisToCents(form.limit) : null,
        closing_day: closingDay,
        due_day: dueDay,
      })
      setForm(emptyForm)
      setOpen(false)
      window.dispatchEvent(new CustomEvent('uaiconta:data-changed', { detail: { table: 'credit_cards' } }))
      await reload()
    } catch (err) { setError(err?.message || 'Não foi possível cadastrar o cartão.') }
    finally { setSaving(false) }
  }

  async function removeCard(card) {
    if (!window.confirm(`Excluir “${card.name}”? As movimentações antigas serão preservadas, mas ficarão sem cartão vinculado.`)) return
    try {
      await entityRepository.remove('credit_cards', card.id)
      window.dispatchEvent(new CustomEvent('uaiconta:data-changed', { detail: { table: 'credit_cards' } }))
      await reload()
    } catch (err) { setError(err?.message || 'Não foi possível excluir o cartão.') }
  }

  return (
    <div className="page-stack">
      <div className="page-intro crud-intro"><div><span className="eyebrow">Pagamentos</span><h1>Cartões e Pix</h1><p>Cadastre cada cartão e acompanhe separadamente quanto saiu no crédito, no débito e via Pix.</p></div><button className="primary-btn" onClick={() => setOpen(true)}><IconPlus size={17}/> Cadastrar cartão</button></div>
      {!isSupabaseConfigured && <div className="inline-alert">Cartões usam o banco real. Configure o Supabase para cadastrar e sincronizar.</div>}
      {error && <div className="inline-alert">{error}</div>}

      {loading ? <div className="panel crud-loading">Carregando...</div> : <div className="payment-folder-grid cards-registry-grid">
        <PaymentFolder title="Pix" subtitle="Gasto realizado neste mês" amount={summary.pix / 100} icon={IconQrcode} accent="#8F5CE0" breakdown={[{ label: 'Total via Pix', value: summary.pix / 100 }]} />
        {summary.cardData.map(({ card, credit, debit, total }) => <div className="registered-card-folder" key={card.id}>
          <PaymentFolder title={card.name} subtitle={card.bank || 'Cartão cadastrado'} amount={total / 100} icon={IconCreditCard} accent="#7B337E" breakdown={[
            { label: 'Crédito neste mês', value: credit / 100 },
            { label: 'Débito neste mês', value: debit / 100 },
            { label: 'Limite cadastrado', value: Number(card.credit_limit_cents || 0) / 100 },
            { label: 'Fechamento', value: card.closing_day ? `dia ${card.closing_day}` : 'não informado' },
            { label: 'Vencimento', value: card.due_day ? `dia ${card.due_day}` : 'não informado' },
          ]} />
          <button className="icon-btn danger registered-card-delete" onClick={() => removeCard(card)} aria-label={`Excluir ${card.name}`}><IconTrash size={17}/></button>
        </div>)}
      </div>}

      {!loading && !cards.length && <div className="panel empty-block"><IconCreditCard size={28}/><strong>Nenhum cartão cadastrado</strong><p>Cadastre o primeiro cartão. Depois, ao lançar um gasto no crédito ou débito, escolha qual cartão foi usado.</p><button className="ghost-btn" onClick={() => setOpen(true)}>Cadastrar cartão</button></div>}

      {open && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}>
        <section className="crud-dialog" role="dialog" aria-modal="true" aria-label="Cadastrar cartão">
          <div className="dialog-head"><div><span className="eyebrow">Novo cartão</span><h2>Cadastro de cartão</h2></div><button className="icon-btn" onClick={() => setOpen(false)} aria-label="Fechar"><IconX size={19}/></button></div>
          <form className="crud-form" onSubmit={save}>
            <label><span>Nome do cartão</span><input required value={form.name} onChange={(e)=>setForm((p)=>({...p,name:e.target.value}))} placeholder="Ex.: Nubank Platinum" /></label>
            <label><span>Banco/instituição</span><input value={form.bank} onChange={(e)=>setForm((p)=>({...p,bank:e.target.value}))} placeholder="Ex.: Nubank" /></label>
            <label><span>Limite <em>opcional</em></span><input inputMode="decimal" value={form.limit} onChange={(e)=>setForm((p)=>({...p,limit:e.target.value}))} placeholder="0,00" /></label>
            <label><span>Dia de fechamento</span><SelectField value={form.closingDay || '__none__'} onChange={(value)=>setForm((p)=>({...p,closingDay:value === '__none__' ? '' : value}))} options={dayOptions} ariaLabel="Dia de fechamento" /></label>
            <label><span>Dia de vencimento</span><SelectField value={form.dueDay || '__none__'} onChange={(value)=>setForm((p)=>({...p,dueDay:value === '__none__' ? '' : value}))} options={dayOptions} ariaLabel="Dia de vencimento" /></label>
            <div className="card-security-note full">O UaiConta não pede nem armazena número completo, CVV ou senha do cartão. O cadastro serve para organizar gastos, limite e vencimento.</div>
            <div className="dialog-actions full"><button type="button" className="ghost-btn" onClick={()=>setOpen(false)}>Cancelar</button><button className="primary-btn" disabled={saving}>{saving?'Salvando...':'Cadastrar cartão'}</button></div>
          </form>
        </section>
      </div>}
    </div>
  )
}
