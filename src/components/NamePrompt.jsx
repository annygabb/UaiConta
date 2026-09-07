'use client'

import React, { useState } from 'react'
import { IconArrowRight, IconUser } from '@tabler/icons-react'
import TextScramble from './ui/TextScramble.jsx'

export default function NamePrompt({ initialName = '', onConfirm }) {
  const [name, setName] = useState(initialName)
  const [saving, setSaving] = useState(false)
  const cleanName = name.trim().replace(/\s+/g, ' ').slice(0, 60)

  async function submit(event) {
    event.preventDefault()
    if (!cleanName || saving) return
    setSaving(true)
    try { await onConfirm(cleanName) }
    finally { setSaving(false) }
  }

  return (
    <div className="modal-backdrop name-prompt-backdrop">
      <section className="name-prompt" role="dialog" aria-modal="true" aria-labelledby="name-prompt-title">
        <span className="name-prompt-icon"><IconUser size={22} /></span>
        <span className="eyebrow">Seu painel</span>
        <h2 id="name-prompt-title"><TextScramble text="Como você quer ser chamada aqui?" /></h2>
        <p>Esse nome aparece na saudação e na navegação. Você pode alterar depois nas preferências.</p>
        <form onSubmit={submit}>
          <label className="field">
            <span>Seu nome</span>
            <input
              autoFocus
              value={name}
              maxLength={60}
              autoComplete="name"
              placeholder="Ex.: Anny"
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <button className="primary-btn name-prompt-submit" disabled={!cleanName || saving}>
            {saving ? 'Salvando...' : 'Entrar no meu painel'} <IconArrowRight size={17} />
          </button>
        </form>
      </section>
    </div>
  )
}
