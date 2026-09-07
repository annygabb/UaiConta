'use client'

import React, { useRef, useState } from 'react'
import { useReducedMotion } from 'motion/react'

const INITIAL_ROTATION = { x: -8, y: -18 }

export default function InteractiveHeroCoin() {
  const reduced = useReducedMotion() ?? false
  const [rotation, setRotation] = useState(INITIAL_ROTATION)
  const [dragging, setDragging] = useState(false)
  const dragRef = useRef(null)

  const pointerDown = (event) => {
    if (reduced) return
    event.currentTarget.setPointerCapture?.(event.pointerId)
    dragRef.current = { x: event.clientX, y: event.clientY, rotation }
    setDragging(true)
  }

  const pointerMove = (event) => {
    const start = dragRef.current
    if (!start || !dragging) return
    const dx = event.clientX - start.x
    const dy = event.clientY - start.y
    setRotation({
      y: start.rotation.y + dx * 0.72,
      x: Math.max(-34, Math.min(28, start.rotation.x - dy * 0.42)),
    })
  }

  const pointerUp = (event) => {
    event.currentTarget.releasePointerCapture?.(event.pointerId)
    dragRef.current = null
    setDragging(false)
  }

  const keyDown = (event) => {
    const step = event.shiftKey ? 24 : 12
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home'].includes(event.key)) return
    event.preventDefault()
    if (event.key === 'Home') {
      setRotation(INITIAL_ROTATION)
      return
    }
    setRotation((current) => ({
      x: event.key === 'ArrowUp'
        ? Math.max(-34, current.x - step)
        : event.key === 'ArrowDown'
          ? Math.min(28, current.x + step)
          : current.x,
      y: event.key === 'ArrowLeft'
        ? current.y - step
        : event.key === 'ArrowRight'
          ? current.y + step
          : current.y,
    }))
  }

  return (
    <button
      type="button"
      className={`auth-interactive-coin ${dragging ? 'is-dragging' : ''} ${reduced ? 'reduce-motion' : ''}`}
      aria-label="Moeda 3D UaiConta. Arraste para girar ou use as setas do teclado. Pressione Home para centralizar."
      title="Arraste ou use as setas para girar"
      onPointerDown={pointerDown}
      onPointerMove={pointerMove}
      onPointerUp={pointerUp}
      onPointerCancel={pointerUp}
      onKeyDown={keyDown}
      style={{ '--coin-rx': `${rotation.x}deg`, '--coin-ry': `${rotation.y}deg` }}
    >
      <span className="auth-coin-scene" aria-hidden="true">
        <span className="auth-vector-coin">
          <span className="auth-vector-face auth-vector-front"><img src="/brand/uai-mark.svg" alt="" /></span>
          <span className="auth-vector-face auth-vector-back"><span>UAI</span></span>
          <span className="auth-vector-rim" />
        </span>
        <svg className="auth-cowboy-hat" viewBox="0 0 180 90" focusable="false">
          <defs>
            <linearGradient id="hatFill" x1="0" x2="1" y1="0" y2="1"><stop stopColor="#8b4e2e"/><stop offset=".52" stopColor="#4f281b"/><stop offset="1" stopColor="#2b1510"/></linearGradient>
          </defs>
          <path d="M42 48c8-7 17-10 22-31 4-14 14-17 27-12 11 4 14 12 16 25 12-7 24-8 34-3 8 4 12 10 12 16-19 12-42 16-70 13-18-2-32-4-41-8Z" fill="url(#hatFill)" stroke="#b8794d" strokeWidth="3"/>
          <path d="M24 52c24 14 55 19 91 14 21-3 37-9 46-17 6 8 3 15-9 21-23 12-56 16-91 10-25-4-40-12-43-20-1-3 1-6 6-8Z" fill="#5c2e1e" stroke="#a96942" strokeWidth="3"/>
          <path d="M61 42c17 5 33 6 49 2" fill="none" stroke="#1e1110" strokeWidth="7" strokeLinecap="round"/>
        </svg>
        <span className="auth-coin-shadow" />
      </span>
      <span className="auth-coin-hint">Arraste ou use as setas para girar</span>
    </button>
  )
}
