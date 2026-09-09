import React, { useCallback, useEffect, useRef, useState } from 'react'
import { IconFaceId } from '@tabler/icons-react'
import { getCurrentSession, getSupabaseClient, isSupabaseConfigured } from '../infrastructure/supabase/client.ts'
import { hasRegisteredPasskey, signInWithPasskey } from '../features/auth/auth.repository.ts'

function supportsMobileBiometricLock() {
  if (typeof window === 'undefined') return false
  return Boolean(
    window.isSecureContext
    && 'PublicKeyCredential' in window
    && window.matchMedia?.('(max-width: 820px)').matches,
  )
}

function friendlyLockError(error) {
  const message = String(error?.message || '')
  if (/cancelada|cancelado|NotAllowedError/i.test(message)) return 'O Face ID foi cancelado. Tente novamente para abrir o UaiConta.'
  return message || 'Não foi possível validar o Face ID agora.'
}

export default function GlobalBiometricLock() {
  const [locked, setLocked] = useState(false)
  const [unlocking, setUnlocking] = useState(false)
  const [lockError, setLockError] = useState('')
  const sessionRef = useRef(null)
  const hasPasskeyRef = useRef(false)
  const unlockingRef = useRef(false)
  const hiddenAtRef = useRef(0)

  const discoverPasskey = useCallback(async () => {
    if (!supportsMobileBiometricLock() || !sessionRef.current?.access_token) {
      hasPasskeyRef.current = false
      return false
    }
    try {
      const hasPasskey = await hasRegisteredPasskey()
      hasPasskeyRef.current = hasPasskey
      return hasPasskey
    } catch {
      hasPasskeyRef.current = false
      return false
    }
  }, [])

  const unlockWithFaceId = useCallback(async () => {
    if (unlockingRef.current || !sessionRef.current?.access_token) return
    unlockingRef.current = true
    setUnlocking(true)
    setLockError('')
    try {
      const nextSession = await signInWithPasskey()
      sessionRef.current = nextSession
      hasPasskeyRef.current = true
      setLocked(false)
    } catch (error) {
      setLocked(true)
      setLockError(friendlyLockError(error))
    } finally {
      unlockingRef.current = false
      setUnlocking(false)
    }
  }, [])

  const lockAndRequestFaceId = useCallback(async () => {
    if (!supportsMobileBiometricLock() || !sessionRef.current?.access_token) return
    const hasPasskey = hasPasskeyRef.current || await discoverPasskey()
    if (!hasPasskey) return
    setLocked(true)
    setLockError('')
    window.setTimeout(() => unlockWithFaceId(), 160)
  }, [discoverPasskey, unlockWithFaceId])

  useEffect(() => {
    if (!isSupabaseConfigured || !supportsMobileBiometricLock()) return undefined
    let active = true

    getCurrentSession()
      .then((session) => {
        if (!active) return
        sessionRef.current = session
        if (session?.access_token) window.setTimeout(() => lockAndRequestFaceId(), 180)
      })
      .catch(() => undefined)

    const { data } = getSupabaseClient().auth.onAuthStateChange((event, session) => {
      sessionRef.current = session
      if (event === 'SIGNED_OUT' || !session?.access_token) {
        hasPasskeyRef.current = false
        setLocked(false)
        setLockError('')
      }
      // Fresh login already authenticated the user. Do not immediately ask twice.
      // The app lock is applied on restored sessions and whenever the app is reopened.
    })

    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [lockAndRequestFaceId])

  useEffect(() => {
    if (!isSupabaseConfigured || !supportsMobileBiometricLock()) return undefined

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAtRef.current = Date.now()
        if (hasPasskeyRef.current && sessionRef.current?.access_token) {
          setLocked(true)
          setLockError('')
        }
        return
      }

      if (document.visibilityState === 'visible' && sessionRef.current?.access_token) {
        const wasAway = Date.now() - hiddenAtRef.current > 450
        if (wasAway) window.setTimeout(() => lockAndRequestFaceId(), 160)
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [lockAndRequestFaceId])

  if (!locked) return null

  return (
    <div className="biometric-app-lock" role="dialog" aria-modal="true" aria-label="UaiConta bloqueado por Face ID">
      <div className="biometric-app-lock-glass" aria-hidden="true" />
      <div className="biometric-app-lock-content">
        <IconFaceId className="biometric-app-lock-icon" size={62} stroke={1.55} aria-hidden="true" />
        <h1>Face ID Necessário<br />para abrir UaiConta</h1>
        {lockError && <p className="biometric-app-lock-error">{lockError}</p>}
        {!unlocking && lockError && (
          <button type="button" className="biometric-app-lock-retry" onClick={unlockWithFaceId}>
            Tentar novamente
          </button>
        )}
        <span className="sr-only" aria-live="polite">{unlocking ? 'Verificando Face ID.' : lockError}</span>
      </div>
    </div>
  )
}
