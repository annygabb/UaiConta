'use client'

import React from 'react'
import { useReducedMotion } from 'motion/react'

export default function ShimmeringText({ text, className = '' }) {
  const reduced = useReducedMotion() ?? false
  return <span className={`shimmering-text ${reduced ? 'reduce-motion' : ''} ${className}`.trim()}>{text}</span>
}
