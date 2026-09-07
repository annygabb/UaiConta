'use client'

import React from 'react'

export default function BrandLogo({ compact = false, className = '' }) {
  return (
    <span className={`brand-logo ${compact ? 'is-compact' : ''} ${className}`.trim()} aria-label="UaiConta">
      <img src={compact ? '/brand/uai-logo-96.png' : '/brand/uai-logo-384.png'} alt="" aria-hidden="true" />
      {!compact && <span><strong>UaiConta</strong><small>Finance OS</small></span>}
    </span>
  )
}
