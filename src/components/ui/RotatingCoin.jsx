'use client'

import React, { useId } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { money } from '../../utils.js'

const GRAPH_PATH = 'M6 100 C36 96 52 110 78 86 C104 62 126 78 148 58 C174 34 196 48 220 28 C246 8 274 20 296 10'

export default function RotatingCoin({ realized = 0, forecast = 0, income = 0, committedRate = 0 }) {
  const reduced = useReducedMotion() ?? false
  const safeRate = Math.max(0, Math.min(100, Number(committedRate || 0)))
  const id = useId().replace(/:/g, '')
  const gradientId = `coinGraph-${id}`

  return (
    <div className="coin-financial-wrap" aria-label={`Sobra realizada ${money(realized)}. Sobra prevista ${money(forecast)}.`}>
      <div className="coin-stage" aria-hidden="true">
        <div className="coin-market-graph">
          <svg viewBox="0 0 302 112" preserveAspectRatio="none" focusable="false">
            <defs>
              <linearGradient id={gradientId} x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%" stopColor="#6667AB" stopOpacity="0" />
                <stop offset="40%" stopColor="#a365c1" stopOpacity=".84" />
                <stop offset="78%" stopColor="#f5d5e0" stopOpacity="1" />
                <stop offset="100%" stopColor="#7B337E" stopOpacity=".08" />
              </linearGradient>
            </defs>
            <motion.path
              d={GRAPH_PATH}
              fill="none"
              stroke={`url(#${gradientId})`}
              strokeWidth="8"
              strokeLinecap="round"
              opacity=".12"
              animate={reduced ? { opacity: .12 } : { opacity: [.02, .18, .02] }}
              transition={reduced ? { duration: 0 } : { duration: 4.3, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.path
              d={GRAPH_PATH}
              fill="none"
              stroke={`url(#${gradientId})`}
              strokeWidth="2"
              strokeLinecap="round"
              pathLength={1}
              initial={reduced ? { pathLength: 1, opacity: .8 } : { pathLength: 0, opacity: 0 }}
              animate={reduced ? { pathLength: 1, opacity: .8 } : { pathLength: [0, 1, 1], opacity: [0, 1, 0] }}
              transition={reduced ? { duration: 0 } : { duration: 4.8, repeat: Infinity, times: [0, .68, 1], ease: 'easeInOut', repeatDelay: .35 }}
            />
          </svg>
        </div>
        <motion.div
          className="coin-3d"
          animate={reduced ? { rotateY: 18, rotateX: -8 } : { rotateY: [0, 360], rotateX: [-8, 5, -8] }}
          transition={reduced ? { duration: 0 } : { rotateY: { duration: 7.5, repeat: Infinity, ease: 'linear' }, rotateX: { duration: 4.5, repeat: Infinity, ease: 'easeInOut' } }}
        >
          <div className="coin-face coin-front"><img src="/brand/uai-mark.svg" alt="" /></div>
          <div className="coin-face coin-back"><span>UAI</span></div>
          <div className="coin-rim" />
        </motion.div>
        <div className="coin-floor-glow" />
        <div className="coin-orbit coin-orbit-a" />
        <div className="coin-orbit coin-orbit-b" />
      </div>
      <div className="spatial-copy coin-copy">
        <span>Sobra prevista</span>
        <strong className={forecast < 0 ? 'negative' : ''}>{money(forecast)}</strong>
        <small>{income > 0 ? `${safeRate.toFixed(0)}% da renda comprometida · realizado ${money(realized)}` : 'Cadastre receitas para calcular a projeção.'}</small>
      </div>
    </div>
  )
}
