'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Link } from 'react-router-dom'
import { IconEye, IconEyeOff, IconFingerprint, IconKey, IconLoader2, IconLock, IconMail, IconUser } from '@tabler/icons-react'
import { requestPasswordReset, signIn, signUp } from '../dataService.js'
import { signInWithPasskey } from '../features/auth/auth.repository.ts'
import { ROUTES } from '../constants.js'
import BrandLogo from './ui/BrandLogo.jsx'
import InteractiveHeroCoin from './ui/InteractiveHeroCoin.jsx'
import MotionInput from './ui/MotionInput.jsx'
import PasswordStrength, { evaluatePassword } from './ui/PasswordStrength.jsx'
import PurpleCheckbox from './ui/PurpleCheckbox.jsx'
import ShimmeringText from './ui/ShimmeringText.jsx'
import TextFlip from './ui/TextFlip.jsx'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function friendlyAuthError(error) {
  const message = String(error?.message || '')
  if (/JWT issued at future/i.test(message)) {
    return 'Não foi possível validar a hora da sessão agora. Confira se Data e Hora automáticas estão ativadas no iPhone.'
  }
  if (/Invalid login credentials/i.test(message)) return 'E-mail ou senha incorretos.'
  if (/Email not confirmed/i.test(message)) return 'Confirme o e-mail de cadastro antes de entrar.'
  if (/User already registered/i.test(message)) return 'Já existe uma conta com este e-mail. Tente entrar.'
  return message || 'Não foi possível concluir esta ação.'
}

export default function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [terms, setTerms] = useState(false)
  const [revealPassword, setRevealPassword] = useState(false)
  const [touched, setTouched] = useState({})
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [biometricLoading, setBiometricLoading] = useState(false)
  const [biometricAvailable, setBiometricAvailable] = useState(false)
  const visualRef = useRef(null)
  const reduce = useReducedMotion() ?? false

  useEffect(() => {
    if (reduce || !visualRef.current) return undefined
    const context = gsap.context(() => {
      gsap.fromTo('[data-auth-reveal]', { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 0.85, stagger: 0.08, ease: 'power3.out' })
      gsap.to('.auth-aurora-a', { xPercent: 12, yPercent: -7, scale: 1.08, duration: 10, repeat: -1, yoyo: true, ease: 'sine.inOut' })
      gsap.to('.auth-aurora-b', { xPercent: -10, yPercent: 8, scale: 1.12, duration: 12, repeat: -1, yoyo: true, ease: 'sine.inOut' })
    }, visualRef)
    return () => context.revert()
  }, [reduce])

  useEffect(() => {
    setTouched({})
    setError('')
    setMessage('')
  }, [mode])

  useEffect(() => {
    const supported = typeof window !== 'undefined'
      && window.isSecureContext
      && 'PublicKeyCredential' in window
      && Boolean(navigator?.credentials?.get)
    setBiometricAvailable(supported)
  }, [])

  const passwordState = useMemo(() => evaluatePassword(password), [password])
  const signupErrors = useMemo(() => {
    const errors = {}
    if (!name.trim()) errors.name = 'Informe como você quer ser chamada.'
    if (!email.trim()) errors.email = 'Informe seu e-mail.'
    else if (!EMAIL_PATTERN.test(email.trim())) errors.email = 'Digite um e-mail válido.'
    if (!password) errors.password = 'Crie uma senha.'
    else if (passwordState.score < passwordState.max || passwordState.guessable) errors.password = 'Use uma senha forte e complete os requisitos abaixo.'
    if (!confirmPassword) errors.confirmPassword = 'Confirme sua senha.'
    else if (confirmPassword !== password) errors.confirmPassword = 'As senhas não são iguais.'
    if (!terms) errors.terms = 'Aceite os termos para criar a conta.'
    return errors
  }, [confirmPassword, email, name, password, passwordState, terms])

  const loginErrors = useMemo(() => {
    const errors = {}
    if (!email.trim()) errors.email = 'Informe seu e-mail.'
    else if (!EMAIL_PATTERN.test(email.trim())) errors.email = 'Digite um e-mail válido.'
    if (mode === 'login' && !password) errors.password = 'Informe sua senha.'
    return errors
  }, [email, mode, password])

  const errors = mode === 'signup' ? signupErrors : loginErrors
  const fieldError = (key) => touched[key] ? errors[key] : undefined
  const fieldSuccess = (key, value) => Boolean(touched[key] && value && !errors[key])

  function touch(key) { setTouched((current) => ({ ...current, [key]: true })) }

  async function submit(event) {
    event.preventDefault()
    setError('')
    setMessage('')

    if (mode === 'signup') setTouched({ name: true, email: true, password: true, confirmPassword: true, terms: true })
    else setTouched({ email: true, password: mode === 'login' })

    if (Object.keys(errors).length) return

    setLoading(true)
    try {
      if (mode === 'login') {
        const session = await signIn(email.trim(), password)
        onAuthenticated(session)
      } else if (mode === 'signup') {
        const result = await signUp(email.trim(), password, name.trim())
        if (result?.pendingConfirmation) {
          setMessage('Conta criada. Confirme seu e-mail e depois entre no UaiConta.')
          setMode('login')
          setPassword('')
          setConfirmPassword('')
        } else onAuthenticated(result)
      } else {
        await requestPasswordReset(email.trim())
        setMessage('Enviamos um link de recuperação para seu e-mail, se a conta existir.')
      }
    } catch (err) {
      setError(friendlyAuthError(err))
    } finally {
      setLoading(false)
    }
  }

  async function biometricSignIn() {
    setError('')
    setMessage('')
    setBiometricLoading(true)
    try {
      const session = await signInWithPasskey()
      onAuthenticated(session)
    } catch (err) {
      setError(friendlyAuthError(err))
    } finally {
      setBiometricLoading(false)
    }
  }

  const isReset = mode === 'reset'
  const title = mode === 'login' ? 'Entrar no UaiConta' : mode === 'signup' ? 'Criar sua conta' : 'Recuperar senha'

  return (
    <main className="auth-page auth-page-v6" ref={visualRef}>
      <section className="auth-visual auth-visual-v6">
        <div className="auth-aurora auth-aurora-a" aria-hidden="true" />
        <div className="auth-aurora auth-aurora-b" aria-hidden="true" />
        <div className="auth-grid-glow" aria-hidden="true" />
        <div data-auth-reveal><BrandLogo /></div>
        <div className="auth-hero-coin"><InteractiveHeroCoin /></div>
        <div className="auth-hero-copy" data-auth-reveal>
          <span className="eyebrow">Finanças sem ruído</span>
          <h1><ShimmeringText text="Transforme seus lançamentos em decisões claras." /></h1>
          <div className="auth-flip-line"><span>Entenda melhor suas</span><TextFlip words={['receitas', 'despesas', 'metas', 'previsões']} /></div>
          <p>Organize o que aconteceu, o que ainda vai acontecer e os documentos que comprovam cada movimento.</p>
        </div>
        <div className="auth-proof-row" data-auth-reveal>
          <span>Dados por usuário</span><span>Planejado x realizado</span><span>Documentos privados</span>
        </div>
      </section>

      <section className="auth-card auth-card-v6" data-auth-reveal>
        <div className="auth-mode-tabs auth-mode-tabs-v6" role="tablist" aria-label="Acesso ao UaiConta">
          <button type="button" role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Entrar</button>
          <button type="button" role="tab" aria-selected={mode === 'signup'} className={mode === 'signup' ? 'active' : ''} onClick={() => setMode('signup')}>Criar conta</button>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            className="auth-form-shell"
            key={mode}
            initial={reduce ? { opacity: 1 } : { opacity: 0, y: 8, filter: 'blur(5px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6, filter: 'blur(4px)' }}
            transition={{ duration: reduce ? 0 : 0.24 }}
          >
            <div className="auth-card-heading">
              <span className="eyebrow">{mode === 'signup' ? 'Comece agora' : 'Acesso à conta'}</span>
              <h2>{title}</h2>
              <p>{isReset ? 'Informe seu e-mail para receber um link seguro de redefinição.' : mode === 'login' ? 'Entre e continue exatamente de onde parou.' : 'Crie sua conta com uma senha forte. Seus dados financeiros ficam separados por usuário.'}</p>
            </div>

            {mode === 'login' && biometricAvailable && (
              <div className="auth-biometric-mobile">
                <button type="button" className="auth-biometric-btn" onClick={biometricSignIn} disabled={biometricLoading || loading}>
                  {biometricLoading ? <IconLoader2 size={20} className="spin" /> : <IconFingerprint size={22} stroke={1.8} />}
                  <span><strong>Entrar com biometria</strong><small>Face ID ou Touch ID</small></span>
                </button>
                <div className="auth-biometric-divider"><span>ou use e-mail e senha</span></div>
              </div>
            )}

            <form onSubmit={submit} noValidate>
              {mode === 'signup' && (
                <MotionInput label="Nome" value={name} onChange={setName} onBlur={() => touch('name')} error={fieldError('name')} success={fieldSuccess('name', name.trim())} reserveErrorLine autoComplete="name" placeholder="Como quer ser chamada?" leftIcon={<IconUser size={18} />} />
              )}

              <MotionInput label="E-mail" type="email" inputMode="email" value={email} onChange={setEmail} onBlur={() => touch('email')} error={fieldError('email')} success={fieldSuccess('email', email.trim())} reserveErrorLine autoComplete="email" placeholder="voce@exemplo.com" leftIcon={<IconMail size={18} />} />

              {!isReset && (
                <>
                  <MotionInput
                    label="Senha"
                    type={revealPassword ? 'text' : 'password'}
                    value={password}
                    onChange={setPassword}
                    onBlur={() => touch('password')}
                    error={fieldError('password')}
                    success={mode === 'signup' ? fieldSuccess('password', password) && passwordState.score === passwordState.max && !passwordState.guessable : fieldSuccess('password', password)}
                    reserveErrorLine
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    placeholder={mode === 'signup' ? 'Crie uma senha forte' : 'Sua senha'}
                    leftIcon={<IconLock size={18} />}
                    rightIcon={<button type="button" className="auth-eye" aria-label={revealPassword ? 'Ocultar senha' : 'Mostrar senha'} onClick={() => setRevealPassword((current) => !current)}>{revealPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}</button>}
                  />
                  {mode === 'signup' && <PasswordStrength value={password} />}
                </>
              )}

              {mode === 'signup' && (
                <MotionInput label="Confirmar senha" type={revealPassword ? 'text' : 'password'} value={confirmPassword} onChange={setConfirmPassword} onBlur={() => touch('confirmPassword')} error={fieldError('confirmPassword')} success={fieldSuccess('confirmPassword', confirmPassword)} reserveErrorLine autoComplete="new-password" placeholder="Digite a mesma senha" leftIcon={<IconLock size={18} />} />
              )}

              {mode === 'signup' && (
                <div className="auth-terms auth-terms-v6">
                  <div className="auth-terms-row">
                    <span>Li e aceito os <Link to={`${ROUTES.legal}#termos`}>Termos</Link> e a <Link to={`${ROUTES.legal}#privacidade`}>Política de Privacidade</Link></span>
                    <PurpleCheckbox checked={terms} onCheckedChange={(checked) => { setTerms(checked); touch('terms') }} ariaLabel="Aceitar Termos e Política de Privacidade" />
                  </div>
                  {fieldError('terms') && <p className="auth-field-error" role="alert">{fieldError('terms')}</p>}
                </div>
              )}

              {error && <div className="inline-alert auth-inline-message">{error}</div>}
              {message && <div className="inline-success auth-inline-message">{message}</div>}

              <motion.button type="submit" className="primary-btn auth-submit auth-submit-v5" disabled={loading || biometricLoading} whileTap={reduce ? undefined : { scale: 0.985 }}>
                {loading && <IconLoader2 size={18} className="spin" />}
                {isReset ? <><IconKey size={17} /> Enviar link</> : mode === 'login' ? 'Entrar no meu painel' : 'Criar minha conta'}
              </motion.button>
            </form>

            <div className="auth-links">
              {mode === 'login' && <button type="button" className="auth-switch" onClick={() => setMode('reset')}>Esqueci minha senha</button>}
              {mode === 'reset' && <button type="button" className="auth-switch" onClick={() => setMode('login')}>Voltar para entrar</button>}
            </div>
          </motion.div>
        </AnimatePresence>
      </section>
    </main>
  )
}
