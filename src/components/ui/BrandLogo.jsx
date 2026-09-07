import React from 'react'

export default function BrandLogo({ compact = false, className = '', size = compact ? 42 : 50 }) {
  return (
    <span className={`uai-brand-logo ${compact ? 'is-compact' : ''} ${className}`.trim()}>
      <img src="/brand/uai-logo-96.png" width={size} height={size} alt="" aria-hidden="true" />
      {!compact && <span className="uai-brand-copy"><strong>UaiConta</strong></span>}
    </span>
  )
}
