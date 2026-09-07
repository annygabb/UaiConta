'use client'

import React, { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useInView, useReducedMotion } from 'motion/react'

export default function TextFlip({ words = [], interval = 1800, className = '' }) {
  const [index, setIndex] = useState(0)
  const ref = useRef(null)
  const inView = useInView(ref)
  const reduced = useReducedMotion() ?? false
  const longest = words.reduce((a, b) => (String(a).length >= String(b).length ? a : b), '')

  useEffect(() => {
    if (reduced || !inView || words.length < 2) return undefined
    const timer = setInterval(() => setIndex((current) => (current + 1) % words.length), interval)
    return () => clearInterval(timer)
  }, [inView, interval, reduced, words.length])

  if (!words.length) return null

  return (
    <span ref={ref} className={`text-flip ${className}`.trim()}>
      <span className="text-flip-placeholder" aria-hidden="true">{longest}</span>
      <span className="sr-only">{words.join(', ')}</span>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={reduced ? 'reduced' : index}
          aria-hidden="true"
          initial={reduced ? { opacity: 1 } : { opacity: 0, y: 12, rotateX: -65, filter: 'blur(6px)' }}
          animate={{ opacity: 1, y: 0, rotateX: 0, filter: 'blur(0px)' }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, y: -12, rotateX: 65, filter: 'blur(6px)' }}
          transition={{ duration: reduced ? 0 : 0.42, ease: [0.22, 1, 0.36, 1] }}
        >{words[reduced ? 0 : index]}</motion.span>
      </AnimatePresence>
    </span>
  )
}
