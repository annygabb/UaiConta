'use client'

import React, { useId } from 'react'
import { IconCheck } from '@tabler/icons-react'

export default function PurpleCheckbox({
  id,
  checked,
  onCheckedChange,
  label,
  description,
  ariaLabel,
  disabled = false,
  className = '',
}) {
  const generatedId = useId()
  const inputId = id || generatedId

  return (
    <label className={`purple-checkbox ${className}`.trim()} htmlFor={inputId}>
      <span className="purple-checkbox-control">
        <input
          id={inputId}
          type="checkbox"
          checked={Boolean(checked)}
          disabled={disabled}
          aria-label={ariaLabel || (!label ? 'Selecionar' : undefined)}
          onChange={(event) => onCheckedChange?.(event.target.checked)}
        />
        <span className="purple-checkbox-box" aria-hidden="true">
          <IconCheck size={14} stroke={3} />
        </span>
      </span>
      {(label || description) && (
        <span className="purple-checkbox-copy">
          {label && <strong>{label}</strong>}
          {description && <small>{description}</small>}
        </span>
      )}
    </label>
  )
}
