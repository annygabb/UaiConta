'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { IconCheck } from '@tabler/icons-react'

const COMMON = /^(?:password|passw0rd|qwerty|letmein|welcome|admin|iloveyou|monkey|dragon|abc123|111111|123123|123456)/i
const RUN = /(.)\1{3,}/
const RUN_UP = /(?:0123|1234|2345|3456|4567|5678|6789|abcd|bcde|cdef|defg|qwer|wert|erty|asdf)/i
const SYMBOL = /[!-/:-@[-`{-~]/

export const passwordRules = [
  { id: 'length', label: '12 caracteres ou mais', test: (value) => value.length >= 12 },
  { id: 'case', label: 'Maiúsculas e minúsculas', test: (value) => /[a-z]/.test(value) && /[A-Z]/.test(value) },
  { id: 'digit', label: 'Pelo menos um número', test: (value) => /\d/.test(value) },
  { id: 'symbol', label: 'Pelo menos um símbolo', test: (value) => SYMBOL.test(value) },
]

const labels = ['Vazia', 'Fraca', 'Razoável', 'Boa', 'Forte']

export function evaluatePassword(value = '') {
  const rules = passwordRules.map((rule) => ({ ...rule, met: rule.test(value) }))
  const passed = rules.reduce((total, rule) => total + (rule.met ? 1 : 0), 0)
  const guessable = value.length > 0 && (COMMON.test(value) || RUN.test(value) || RUN_UP.test(value))
  const score = value.length === 0 ? 0 : guessable ? 1 : Math.min(passwordRules.length, Math.max(1, passed))
  return { score, max: passwordRules.length, label: labels[Math.min(score, labels.length - 1)], rules, guessable }
}

export default function PasswordStrength({ value = '', showRules = true }) {
  const reduced = useReducedMotion() ?? false
  const state = useMemo(() => evaluatePassword(value), [value])
  const [announcement, setAnnouncement] = useState('')

  useEffect(() => {
    if (!value) { setAnnouncement(''); return undefined }
    const unmet = state.rules.filter((rule) => !rule.met)
    const text = [
      `Força da senha: ${state.label.toLowerCase()}.`,
      state.guessable ? 'Esse padrão é fácil de adivinhar.' : '',
      unmet.length ? `Ainda falta: ${unmet.map((rule) => rule.label.toLowerCase()).join(', ')}.` : 'Todos os requisitos foram atendidos.',
    ].filter(Boolean).join(' ')
    const timer = setTimeout(() => setAnnouncement(text), 600)
    return () => clearTimeout(timer)
  }, [state, value])

  if (!value) return null

  return (
    <div className={`password-strength strength-${state.score}`}>
      <div className="password-strength-meter" role="meter" aria-label="Força da senha" aria-valuemin="0" aria-valuemax={state.max} aria-valuenow={state.score} aria-valuetext={state.label}>
        {Array.from({ length: state.max }, (_, index) => (
          <span key={index}><motion.i initial={false} animate={{ scaleX: index < state.score ? 1 : 0 }} transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 34, mass: 0.45, delay: index < state.score ? index * 0.03 : 0 }} /></span>
        ))}
      </div>
      <div className="password-strength-line"><strong>{state.label}</strong>{state.guessable && <span>Evite padrões comuns</span>}</div>
      {showRules && <ul>{state.rules.map((rule) => <li key={rule.id} className={rule.met ? 'met' : ''}><span><IconCheck size={11} /></span>{rule.label}</li>)}</ul>}
      <p className="sr-only" aria-live="polite">{announcement}</p>
    </div>
  )
}
