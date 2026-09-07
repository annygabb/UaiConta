'use client'

import React from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { money } from '../../utils.js'

export default function RotatingCoin({ realized = 0, forecast = 0, income = 0, committedRate = 0 }) {
  const reduced = useReducedMotion() ?? false
  const safeRate = Math.max(0, Math.min(100, Number(committedRate || 0)))
  return (
    <div className="coin-financial-wrap" aria-label={`Sobra realizada ${money(realized)}. Sobra prevista ${money(forecast)}.`}>
      <div className="coin-stage" aria-hidden="true">
        <motion.div
          className="coin-3d"
          animate={reduced ? { rotateY: 18, rotateX: -8 } : { rotateY: [0, 360], rotateX: [-8, 5, -8] }}
          transition={reduced ? { duration: 0 } : { rotateY: { duration: 7.5, repeat: Infinity, ease: 'linear' }, rotateX: { duration: 4.5, repeat: Infinity, ease: 'easeInOut' } }}
        >
          <div className="coin-face coin-front"><img src="/brand/uai-mark.svg" alt="" /></div>
          <div className="coin-face coin-back"><span>UAI</span></div>
          <div className="coin-rim" />
        </motion.div>
        <div className="coin-market-lines" aria-hidden="true">
          {[18, 34, 26, 52, 41, 67, 49, 78, 58].map((height, index) => <span key={index} style={{ '--line-h': `${height}px`, '--line-i': index }} />)}
        </div>
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
