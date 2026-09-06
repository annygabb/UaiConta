import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { IconKey, IconLoader2 } from '@tabler/icons-react'
import { updatePassword } from '../dataService.js'
import { ROUTES } from '../constants.js'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  async function submit(event) {
    event.preventDefault()
    if (password.length < 8) { setMessage('Use pelo menos 8 caracteres.'); return }
    if (password !== confirm) { setMessage('As senhas não coincidem.'); return }
    setBusy(true); setMessage('')
    try { await updatePassword(password); setMessage('Senha atualizada. Você já pode voltar ao painel.') }
    catch (err) { setMessage(err?.message || 'Não foi possível alterar a senha.') }
    finally { setBusy(false) }
  }

  return <main className="auth-page"><section className="auth-card"><div><span className="eyebrow">Recuperação</span><h2>Defina uma nova senha</h2><p>Use uma senha exclusiva para sua conta do UaiConta.</p></div><form onSubmit={submit}><label><span>Nova senha</span><div className="input-icon"><IconKey size={16}/><input type="password" minLength={8} value={password} onChange={(e)=>setPassword(e.target.value)} required autoComplete="new-password"/></div></label><label><span>Confirmar senha</span><div className="input-icon"><IconKey size={16}/><input type="password" minLength={8} value={confirm} onChange={(e)=>setConfirm(e.target.value)} required autoComplete="new-password"/></div></label>{message&&<div className="inline-alert">{message}</div>}<button className="primary-btn auth-submit" disabled={busy}>{busy&&<IconLoader2 size={17} className="spin"/>}Atualizar senha</button></form><Link className="auth-switch" to={ROUTES.dashboard}>Voltar ao painel</Link></section></main>
}
