'use client'

import React, { useState } from 'react'
import { IconArrowRight, IconUser } from '@tabler/icons-react'
import TextScramble from './ui/TextScramble.jsx'
import MotionInput from './ui/MotionInput.jsx'
import BrandLogo from './ui/BrandLogo.jsx'

export default function NamePrompt({ initialName = '', onConfirm }) {
  const [name, setName] = useState(initialName)
  const [saving, setSaving] = useState(false)
  const [touched, setTouched] = useState(false)
  const cleanName = name.trim().replace(/\s+/g, ' ').slice(0, 60)

  async function submit(event) {
    event.preventDefault()
    setTouched(true)
    if (!cleanName || saving) return
    setSaving(true)
    try { await onConfirm(cleanName) }
    finally { setSaving(false) }
  }

  return (
    <div className="modal-backdrop name-prompt-backdrop">
      <section className="name-prompt name-prompt-v5" role="dialog" aria-modal="true" aria-labelledby="name-prompt-title">
        <BrandLogo />
        <span className="eyebrow">Seu painel</span>
        <h2 id="name-prompt-title"><TextScramble text="Como você quer ser chamada aqui?" /></h2>
        <p>Esse nome aparece na saudação e na navegação. Você pode alterar depois nas preferências.</p>
        <form onSubmit={submit}>
          <MotionInput autoFocus label="Seu nome" value={name} onChange={setName} onBlur={()=>setTouched(true)} maxLength={60} autoComplete="name" placeholder="Ex.: Anny" leftIcon={<IconUser size={18}/>} error={touched && !cleanName ? 'Informe um nome para continuar.' : undefined} success={Boolean(touched && cleanName)} reserveErrorLine />
          <button className="primary-btn name-prompt-submit" disabled={!cleanName || saving}>{saving ? 'Salvando...' : 'Entrar no meu painel'} <IconArrowRight size={17} /></button>
        </form>
      </section>
    </div>
  )
}
