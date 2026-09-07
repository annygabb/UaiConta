import React, { useRef } from 'react'
import * as Select from '@radix-ui/react-select'
import { IconCheck, IconChevronDown, IconChevronUp } from '@tabler/icons-react'

function normalizeOptions(options = []) {
  return options.map((option) => typeof option === 'string' ? { value: option, label: option } : option)
}

export default function SelectField({ value, onChange, options, placeholder = 'Selecione', ariaLabel }) {
  const normalized = normalizeOptions(options)
  const triggerRef = useRef(null)
  const scrollRef = useRef(0)

  const onOpenChange = (open) => {
    if (open) scrollRef.current = window.scrollY
    else requestAnimationFrame(() => window.scrollTo({ top: scrollRef.current, behavior: 'auto' }))
  }

  return <Select.Root value={value || undefined} onValueChange={onChange} onOpenChange={onOpenChange}>
    <Select.Trigger ref={triggerRef} className="select-trigger" aria-label={ariaLabel}>
      <Select.Value placeholder={placeholder} />
      <Select.Icon><IconChevronDown size={16}/></Select.Icon>
    </Select.Trigger>
    <Select.Portal>
      <Select.Content
        className="select-content select-content-stable"
        position="popper"
        side="bottom"
        align="start"
        sideOffset={6}
        collisionPadding={12}
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          triggerRef.current?.focus({ preventScroll: true })
        }}
      >
        <Select.ScrollUpButton className="select-scroll"><IconChevronUp size={15}/></Select.ScrollUpButton>
        <Select.Viewport className="select-viewport">
          {normalized.map((option) => <Select.Item key={option.value} value={String(option.value)} className="select-item">
            <Select.ItemText>{option.label}</Select.ItemText>
            <Select.ItemIndicator><IconCheck size={15}/></Select.ItemIndicator>
          </Select.Item>)}
        </Select.Viewport>
        <Select.ScrollDownButton className="select-scroll"><IconChevronDown size={15}/></Select.ScrollDownButton>
      </Select.Content>
    </Select.Portal>
  </Select.Root>
}
