'use client'

import React, { forwardRef, useEffect, useId, useRef, useState } from 'react'
import { AnimatePresence, animate, motion, useReducedMotion } from 'motion/react'

export const MotionInput = forwardRef(function MotionInput({
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
  fieldClassName = '',
  inputClassName = '',
  disabled,
  id: idProp,
  type = 'text',
  ...rest
}, ref) {
  const reactId = useId()
  const id = idProp || reactId
  const reduce = useReducedMotion() ?? false
  const controlled = valueProp !== undefined
  const [internal, setInternal] = useState(defaultValue)
  const value = controlled ? (valueProp ?? '') : internal
  const [focused, setFocused] = useState(false)
  const fieldRef = useRef(null)
  const hasError = Boolean(error)
  const errorMessage = typeof error === 'string' ? error : null

  useEffect(() => {
    if (!fieldRef.current || reduce || !hasError) return
    animate(fieldRef.current, { x: [0, -6, 6, -4, 4, -2, 0] }, { duration: .45 })
  }, [hasError, reduce])

  function handleChange(next) {
    if (!controlled) setInternal(next)
    onChange?.(next)
  }

  return (
    <div className={`motion-field ${className}`.trim()}>
      {label && <label htmlFor={id}>{label}</label>}
      <div
        ref={fieldRef}
        data-state={hasError ? 'error' : success ? 'success' : focused ? 'focused' : 'idle'}
        className={`motion-input-shell ${fieldClassName}`.trim()}
      >
        {leftIcon && <span className="motion-input-left" aria-hidden="true">{leftIcon}</span>}
        <input
          ref={ref}
          id={id}
          type={type}
          value={value}
          disabled={disabled}
          aria-invalid={hasError || undefined}
          aria-describedby={errorMessage ? `${id}-error` : undefined}
          {...rest}
          onChange={(event) => handleChange(event.target.value)}
          onFocus={(event) => { setFocused(true); onFocus?.(event) }}
          onBlur={(event) => { setFocused(false); onBlur?.(event) }}
          className={inputClassName}
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
              transition={{ duration: .35, ease: 'easeOut' }}
            />
          </motion.svg>
        ) : rightIcon ? <span className="motion-input-right">{rightIcon}</span> : null}
      </div>
      <div className={reserveErrorLine ? 'motion-error-line' : ''}>
        <AnimatePresence initial={false}>
          {errorMessage && (
            <motion.p
              id={`${id}-error`}
              role="alert"
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: -4, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4, filter: 'blur(4px)' }}
              transition={{ duration: .2 }}
              className="motion-input-error"
            >{errorMessage}</motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
})
