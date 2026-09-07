'use client'

import React, { forwardRef, useEffect, useId, useRef, useState } from 'react'
import { AnimatePresence, animate, motion, useReducedMotion } from 'motion/react'

function join(...parts) { return parts.filter(Boolean).join(' ') }

const MotionInput = forwardRef(function MotionInput({
  label,
  value: valueProp,
  defaultValue = '',
  onChange,
  onFocus,
  onBlur,
  error,
  reserveErrorLine = false,
  success = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  id: idProp,
  type = 'text',
  ...rest
}, forwardedRef) {
  const reactId = useId()
  const id = idProp || reactId
  const reduce = useReducedMotion() ?? false
  const controlled = valueProp !== undefined
  const [internal, setInternal] = useState(defaultValue)
  const [focused, setFocused] = useState(false)
  const fieldRef = useRef(null)
  const value = controlled ? (valueProp ?? '') : internal
  const hasError = Boolean(error)
  const errorMessage = typeof error === 'string' ? error : null
  const rightSlot = success ? null : rightIcon

  useEffect(() => {
    if (!fieldRef.current || reduce || !hasError) return
    const controls = animate(fieldRef.current, { x: [0, -6, 6, -4, 4, -2, 0] }, { duration: 0.45 })
    return () => controls.stop()
  }, [hasError, reduce])

  return (
    <div className={join('motion-input-root', className)}>
      {label && <label htmlFor={id} className="motion-input-label">{label}</label>}
      <div ref={fieldRef} className={join('motion-input-field', focused && !hasError && 'is-focused', hasError && 'has-error', success && 'is-success', disabled && 'is-disabled')}>
        {leftIcon && <span className="motion-input-left" aria-hidden="true">{leftIcon}</span>}
        <input
          ref={forwardedRef}
          id={id}
          type={type}
          value={value}
          disabled={disabled}
          aria-invalid={hasError || undefined}
          aria-describedby={errorMessage ? `${id}-error` : undefined}
          {...rest}
          onChange={(event) => {
            const next = event.target.value
            if (!controlled) setInternal(next)
            onChange?.(next)
          }}
          onFocus={(event) => { setFocused(true); onFocus?.(event) }}
          onBlur={(event) => { setFocused(false); onBlur?.(event) }}
          className={join('motion-input-control', leftIcon && 'has-left', (rightSlot || success) && 'has-right')}
        />
        {success ? (
          <motion.svg viewBox="0 0 24 24" fill="none" className="motion-input-success" aria-hidden="true">
            <motion.path
              d="M5 12.5l4.5 4.5L19 7.5"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={reduce ? { pathLength: 1 } : { pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: reduce ? 0 : 0.35, ease: 'easeOut' }}
            />
          </motion.svg>
        ) : rightSlot ? <span className="motion-input-right">{rightSlot}</span> : null}
      </div>
      <div className={reserveErrorLine ? 'motion-input-message reserved' : 'motion-input-message'}>
        <AnimatePresence initial={false}>
          {errorMessage && (
            <motion.p
              id={`${id}-error`}
              role="alert"
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: -4, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4, filter: 'blur(4px)' }}
              transition={{ duration: reduce ? 0 : 0.2 }}
            >{errorMessage}</motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
})

export default MotionInput
