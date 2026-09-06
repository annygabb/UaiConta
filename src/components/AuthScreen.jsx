import React, { useState } from 'react'
import { IconCoin, IconKey, IconLoader2, IconLock, IconMail } from '@tabler/icons-react'
import { requestPasswordReset, signIn, signUp } from '../dataService.js'

export default function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setError(''); setMessage(''); setLoading(true)
    try {
      if (mode === 'login') {
        const session = await signIn(email.trim(), password)
        onAuthenticated(session)
      } else if (mode === 'signup') {
        const result = await signUp(email.trim(), password)
        if (result?.pendingConfirmation) setMessage('Conta criada. Confirme seu e-mail e depois entre no UaiConta.')
        else onAuthenticated(result)
      } else {
        await requestPasswordReset(email.trim())
        setMessage('Enviamos um link de recuperação para seu e-mail, se a conta existir.')
      }
    } catch (err) {
      setError(err?.message || 'Não foi possível concluir esta ação.')
    } finally { setLoading(false) }
  }

  const isReset = mode === 'reset'
  const title = mode === 'login' ? 'Entrar no UaiConta' : mode === 'signup' ? 'Criar sua conta' : 'Recuperar senha'

  return <main className="auth-page"><section className="auth-visual"><div className="brand auth-brand"><span className="brand-mark"><IconCoin size={20}/></span><span><strong>UaiConta</strong><small>Finance OS</small></span></div><div className="auth-orb"><div className="orbit orbit-a"/><div className="orbit orbit-b"/><div className="spatial-core"/></div><div><span className="eyebrow">Finanças sem ruído</span><h1>Transforme seus lançamentos em decisões claras.</h1><p>Entenda receitas, gastos, investimentos, previsões e documentos financeiros em um só lugar.</p></div></section><section className="auth-card"><div><span className="eyebrow">{mode==='login'?'Bem-vinda de volta':mode==='signup'?'Comece agora':'Acesso à conta'}</span><h2>{title}</h2><p>{isReset?'Informe seu e-mail para receber um link seguro de redefinição.':mode==='login'?'Acesse seus dados protegidos pelo seu usuário.':'Use um e-mail válido e uma senha com pelo menos 8 caracteres.'}</p></div><form onSubmit={submit}><label><span>E-mail</span><div className="input-icon"><IconMail size={16}/><input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} required autoComplete="email"/></div></label>{!isReset&&<label><span>Senha</span><div className="input-icon"><IconLock size={16}/><input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} required minLength={8} autoComplete={mode==='login'?'current-password':'new-password'}/></div></label>}{error&&<div className="inline-alert">{error}</div>}{message&&<div className="inline-success">{message}</div>}<button className="primary-btn auth-submit" disabled={loading}>{loading&&<IconLoader2 size={17} className="spin"/>}{isReset?<><IconKey size={16}/> Enviar link</>:mode==='login'?'Entrar':'Criar conta'}</button></form><div className="auth-links">{mode==='login'&&<button className="auth-switch" onClick={()=>setMode('reset')}>Esqueci minha senha</button>}<button className="auth-switch" onClick={()=>setMode(mode==='signup'?'login':mode==='login'?'signup':'login')}>{mode==='login'?'Ainda não tem conta? Criar conta':mode==='signup'?'Já tem conta? Entrar':'Voltar para entrar'}</button></div></section></main>
}
