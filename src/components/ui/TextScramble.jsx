'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'motion/react'

const DEFAULT_GLYPHS = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&@$?/'

export default function TextScramble({ text, duration, glyphs = DEFAULT_GLYPHS, className = '', style }) {
  const reduce = useReducedMotion() ?? false
  const [display, setDisplay] = useState(text)
  const previousText = useRef(text)

  useEffect(() => {
    if (previousText.current === text) {
      setDisplay(text)
      return undefined
    }
    previousText.current = text

    if (reduce || !glyphs) {
      setDisplay(text)
      return undefined
    }

    const characters = text.split('')
    const startedAt = performance.now()
    const animationDuration = duration ?? Math.min(760, Math.max(420, characters.length * 32))
    let frame = 0
    let lastUpdate = 0

    const animate = (now) => {
      if (now - lastUpdate >= 40) {
        lastUpdate = now
        const progress = Math.min((now - startedAt) / animationDuration, 1)
        const settled = Math.floor(progress * characters.length)
        setDisplay(characters.map((character, index) => {
          if (index < settled || character === ' ') return character
          return glyphs[Math.floor(Math.random() * glyphs.length)]
        }).join(''))
      }

      if (now - startedAt < animationDuration) frame = requestAnimationFrame(animate)
      else setDisplay(text)
    }

    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [duration, glyphs, reduce, text])

  return (
    <span className={`text-scramble ${className}`.trim()} style={style}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">{reduce ? text : display}</span>
    </span>
  )
}
