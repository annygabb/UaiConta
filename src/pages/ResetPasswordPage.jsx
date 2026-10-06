import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { IconKey, IconLoader2, IconLock } from '@tabler/icons-react'
import { updatePassword } from '../dataService.js'
import { ROUTES } from '../constants.js'
import MotionInput from '../components/ui/MotionInput.jsx'
import PasswordStrength, { evaluatePassword } from '../components/ui/PasswordStrength.jsx'
import BrandLogo from '../components/ui/BrandLogo.jsx'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [touched, setTouched] = useState(false)
  const [fieldsLocked, setFieldsLocked] = useState(true)
  const passwordRef = useRef(null)
  const confirmRef = useRef(null)
  const interactedRef = useRef(false)
  const strength = useMemo(() => evaluatePassword(password), [password])
  const valid = strength.score === strength.max && !strength.guessable

  useEffect(() => {
    // Some password managers ignore autocomplete="new-password" and inject the
    // saved current password after hydration. Keep the fields read-only until
    // the person intentionally focuses them and remove any injected DOM value.
    const clearUnexpectedAutofill = () => {
      if (interactedRef.current) return
      setPassword('')
      setConfirm('')
      if (passwordRef.current) passwordRef.current.value = ''
      if (confirmRef.current) confirmRef.current.value = ''
    }
    clearUnexpectedAutofill()
    const frame = window.requestAnimationFrame(clearUnexpectedAutofill)
    const timer = window.setTimeout(clearUnexpectedAutofill, 500)
    return () => {
      window.cancelAnimationFrame(frame)
      window.clearTimeout(timer)
    }
  }, [])

  function unlockFields(event) {
    if (!interactedRef.current) {
      setPassword('')
      setConfirm('')
      event.currentTarget.value = ''
    }
    interactedRef.current = true
    setFieldsLocked(false)
  }

  async function submit(event) {
    event.preventDefault()
    setTouched(true)
    if (!valid) { setMessage('Crie uma senha forte e complete todos os requisitos.'); return }
    if (password !== confirm) { setMessage('As senhas não coincidem.'); return }
    setBusy(true); setMessage('')
    try { await updatePassword(password); setMessage('Senha atualizada. Você já pode voltar ao painel.') }
    catch (err) { setMessage(err?.message || 'Não foi possível alterar a senha.') }
    finally { setBusy(false) }
  }

  return <main className="auth-page reset-auth-page"><section className="auth-card auth-card-v5 reset-auth-card"><BrandLogo /><div className="auth-card-heading"><span className="eyebrow">Recuperação</span><h2>Defina uma nova senha</h2><p>Use uma senha exclusiva e forte para sua conta do UaiConta.</p></div><form onSubmit={submit} noValidate autoComplete="off"><MotionInput ref={passwordRef} label="Nova senha" name="uai-new-password" type="password" value={password} readOnly={fieldsLocked} onFocus={unlockFields} onChange={(value)=>{ interactedRef.current = true; setPassword(value) }} onBlur={()=>setTouched(true)} error={touched && !valid ? 'Complete os requisitos de segurança.' : undefined} leftIcon={<IconLock size={18}/>} reserveErrorLine autoComplete="new-password" autoCapitalize="none" spellCheck={false}/><PasswordStrength value={password}/><MotionInput ref={confirmRef} label="Confirmar senha" name="uai-confirm-new-password" type="password" value={confirm} readOnly={fieldsLocked} onFocus={unlockFields} onChange={(value)=>{ interactedRef.current = true; setConfirm(value) }} error={touched && confirm && confirm !== password ? 'As senhas não coincidem.' : undefined} success={Boolean(confirm && confirm === password)} leftIcon={<IconKey size={18}/>} reserveErrorLine autoComplete="new-password" autoCapitalize="none" spellCheck={false}/>{message&&<div className="inline-alert">{message}</div>}<button className="primary-btn auth-submit auth-submit-v5" disabled={busy}>{busy&&<IconLoader2 size={17} className="spin"/>}Atualizar senha</button></form><Link className="auth-switch" to={ROUTES.dashboard}>Voltar ao painel</Link></section></main>
}
