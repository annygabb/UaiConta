import React, { useEffect, useMemo, useState } from 'react'
import { IconEdit, IconPlus, IconTrash, IconX } from '@tabler/icons-react'
import { entityRepository } from '../../features/settings/entity.repository.ts'
import { isSupabaseConfigured } from '../../infrastructure/supabase/client.ts'
import { formatCents, reaisToCents } from '../../domain/money/money.ts'
import SelectField from '../../components/ui/SelectField.jsx'

function normalizeValue(field, value) {
  if (field.money) return reaisToCents(value)
  if (field.type === 'number') return value === '' ? null : Number(value)
  if (field.type === 'checkbox') return Boolean(value)
  return value || null
}

function inputValue(field, row) {
  const value = row?.[field.key]
  if (field.money) return value == null ? '' : String(Number(value) / 100).replace('.', ',')
  if (field.type === 'checkbox') return Boolean(value)
  return value ?? field.defaultValue ?? ''
}

export default function SimpleCrudPage({
  title,
  eyebrow,
  description,
  table,
  fields,
  itemTitle = (row) => row.name || row.description || 'Item',
  itemSubtitle,
  emptyText = 'Nenhum item cadastrado ainda.',
}) {
  const [rows, setRows] = useState([])
  const [editing, setEditing] = useState(undefined)
  const [form, setForm] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const initialForm = useMemo(() => Object.fromEntries(fields.map((field) => [field.key, field.defaultValue ?? ''])), [fields])

  async function reload() {
    if (!isSupabaseConfigured) { setLoading(false); return }
    setLoading(true)
    setError('')
    try { setRows(await entityRepository.list(table)) }
    catch (err) { setError(err?.message || 'Não foi possível carregar os dados.') }
    finally { setLoading(false) }
  }

  useEffect(() => { reload() }, [table])

  function openNew() {
    setEditing(null)
    setForm(initialForm)
  }

  function openEdit(row) {
    setEditing(row)
    setForm(Object.fromEntries(fields.map((field) => [field.key, inputValue(field, row)])))
  }

  function closeForm() {
    setEditing(undefined)
    setForm({})
  }

  async function save(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    const payload = Object.fromEntries(fields.map((field) => [field.key, normalizeValue(field, form[field.key])]))
    try {
      if (editing?.id) await entityRepository.update(table, editing.id, payload)
      else await entityRepository.create(table, payload)
      closeForm()
      window.dispatchEvent(new CustomEvent('uaiconta:data-changed', { detail: { table } }))
      await reload()
    } catch (err) { setError(err?.message || 'Não foi possível salvar.') }
    finally { setSaving(false) }
  }

  async function remove(row) {
    if (!window.confirm(`Excluir “${itemTitle(row)}”?`)) return
    try {
      await entityRepository.remove(table, row.id)
      window.dispatchEvent(new CustomEvent('uaiconta:data-changed', { detail: { table } }))
      await reload()
    } catch (err) { setError(err?.message || 'Não foi possível excluir.') }
  }

  const formOpen = editing !== undefined

  return <div className="page-stack">
    <div className="page-intro crud-intro">
      <div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>
      <button className="primary-btn" onClick={openNew}><IconPlus size={17}/> Adicionar</button>
    </div>

    {!isSupabaseConfigured && <div className="inline-alert">Este módulo usa o banco real. Configure o Supabase para criar e sincronizar estes dados.</div>}
    {error && <div className="inline-alert">{error}</div>}

    {loading ? <div className="panel crud-loading">Carregando...</div> : rows.length === 0 ? (
      <div className="panel empty-block"><strong>{emptyText}</strong><p>Use o botão Adicionar para criar o primeiro registro.</p></div>
    ) : (
      <div className="crud-list">
        {rows.map((row) => <article className="panel crud-row" key={row.id}>
          <div className="crud-copy"><strong>{itemTitle(row)}</strong>{itemSubtitle && <p>{itemSubtitle(row)}</p>}</div>
          <div className="crud-actions"><button className="icon-btn" onClick={() => openEdit(row)} aria-label="Editar"><IconEdit size={18}/></button><button className="icon-btn danger" onClick={() => remove(row)} aria-label="Excluir"><IconTrash size={18}/></button></div>
        </article>)}
      </div>
    )}

    {formOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeForm() }}>
      <section className="crud-dialog" role="dialog" aria-modal="true" aria-label={editing?.id ? `Editar ${title}` : `Adicionar ${title}`}>
        <div className="dialog-head"><div><span className="eyebrow">{editing?.id ? 'Editar' : 'Novo registro'}</span><h2>{title}</h2></div><button className="icon-btn" onClick={closeForm} aria-label="Fechar"><IconX size={19}/></button></div>
        <form className="crud-form" onSubmit={save}>
          {fields.map((field) => <label key={field.key} className={field.full ? 'full' : ''}><span>{field.label}</span>{field.type === 'select' ? (
            <SelectField value={form[field.key] ?? ''} onChange={(value) => setForm((prev) => ({ ...prev, [field.key]: value }))} options={field.options || []} placeholder="Selecione" ariaLabel={field.label} />
          ) : field.type === 'checkbox' ? (
            <input type="checkbox" checked={Boolean(form[field.key])} onChange={(event) => setForm((prev) => ({ ...prev, [field.key]: event.target.checked }))}/>
          ) : (
            <input type={field.type || 'text'} inputMode={field.money ? 'decimal' : undefined} value={form[field.key] ?? ''} onChange={(event) => setForm((prev) => ({ ...prev, [field.key]: event.target.value }))} required={field.required} min={field.min} max={field.max} placeholder={field.placeholder}/>
          )}</label>)}
          <div className="dialog-actions full"><button type="button" className="ghost-btn" onClick={closeForm}>Cancelar</button><button className="primary-btn" disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button></div>
        </form>
      </section>
    </div>}
  </div>
}

export const moneyText = (cents) => formatCents(Number(cents || 0))
