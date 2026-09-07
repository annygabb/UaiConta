import React from 'react'
import * as Select from '@radix-ui/react-select'
import { IconCheck, IconChevronDown, IconChevronUp } from '@tabler/icons-react'

function normalizeOptions(options = []) {
  return options.map((option) => typeof option === 'string' ? { value: option, label: option } : option)
}

export default function SelectField({ value, onChange, options, placeholder = 'Selecione', ariaLabel }) {
  const normalized = normalizeOptions(options)
  return <Select.Root value={value || undefined} onValueChange={onChange}>
    <Select.Trigger className="select-trigger" aria-label={ariaLabel}>
      <Select.Value placeholder={placeholder} />
      <Select.Icon><IconChevronDown size={16}/></Select.Icon>
    </Select.Trigger>
    <Select.Portal>
      <Select.Content className="select-content" position="popper" sideOffset={6}>
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
