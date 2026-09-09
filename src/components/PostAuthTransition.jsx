import React, { useEffect, useRef, useState } from 'react'
import { MorphingSquare } from './ui/morphing-square.tsx'
import { getSupabaseClient, isSupabaseConfigured } from '../infrastructure/supabase/client.ts'

const MIN_VISIBLE_MS = 1450

export default function PostAuthTransition() {
  const [visible, setVisible] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => {
    if (!isSupabaseConfigured) return undefined

    const { data } = getSupabaseClient().auth.onAuthStateChange((event, session) => {
      if (event !== 'SIGNED_IN' || !session?.access_token) return

      if (timerRef.current) window.clearTimeout(timerRef.current)
      setVisible(true)
      timerRef.current = window.setTimeout(() => {
        setVisible(false)
        timerRef.current = null
      }, MIN_VISIBLE_MS)
    })

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
      data.subscription.unsubscribe()
    }
  }, [])

  if (!visible) return null

  return (
    <div className="post-auth-loading" role="status" aria-live="polite" aria-label="Abrindo seu painel">
      <div className="post-auth-loading-glow" aria-hidden="true" />
      <MorphingSquare
        message="Abrindo seu painel..."
        className="!h-12 !w-12 !bg-[#a56ad9] shadow-[0_0_38px_rgba(165,106,217,.34)]"
      />
    </div>
  )
}
