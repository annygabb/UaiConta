'use client'

import React, { useId } from 'react'
import { motion, useReducedMotion } from 'motion/react'

const PATH = 'M8 178 C58 170 82 196 126 158 C166 124 210 150 248 112 C292 68 330 104 374 74 C420 44 454 70 498 40 C532 17 566 29 592 14'
const AREA = `${PATH} L592 218 L8 218 Z`

export default function InteractiveHeroCoin() {
  const reduced = useReducedMotion() ?? false
  const uid = useId().replace(/:/g, '')
  const line = `heroLine-${uid}`
  const area = `heroArea-${uid}`

  return (
    <div className="auth-hero-chart" aria-hidden="true">
      <svg viewBox="0 0 600 220" preserveAspectRatio="none" focusable="false">
        <defs>
          <linearGradient id={line} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#6667AB" stopOpacity="0" />
            <stop offset="28%" stopColor="#9e67c3" stopOpacity=".72" />
            <stop offset="68%" stopColor="#efd6fb" stopOpacity="1" />
            <stop offset="100%" stopColor="#7B337E" stopOpacity=".06" />
          </linearGradient>
          <linearGradient id={area} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#a767c6" stopOpacity=".16" />
            <stop offset="100%" stopColor="#420D4B" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={AREA} fill={`url(#${area})`} />
        <motion.path
          d={PATH}
          fill="none"
          stroke={`url(#${line})`}
          strokeWidth="10"
          strokeLinecap="round"
          opacity=".12"
          initial={false}
          animate={reduced ? { opacity: .12 } : { opacity: [.03, .18, .03] }}
          transition={reduced ? { duration: 0 } : { duration: 5.2, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.path
          d={PATH}
          fill="none"
          stroke={`url(#${line})`}
          strokeWidth="2.6"
          strokeLinecap="round"
          pathLength={1}
          initial={reduced ? { pathLength: 1, opacity: .8 } : { pathLength: 0, opacity: 0 }}
          animate={reduced ? { pathLength: 1, opacity: .8 } : { pathLength: [0, 1, 1], opacity: [0, 1, 0] }}
          transition={reduced ? { duration: 0 } : { duration: 5.8, repeat: Infinity, times: [0, .66, 1], ease: 'easeInOut', repeatDelay: .45 }}
        />
      </svg>
      <div className="auth-hero-chart-glow" />
    </div>
  )
}
