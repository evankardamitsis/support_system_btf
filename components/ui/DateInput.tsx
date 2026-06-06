'use client'

import { Calendar } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { formatDate, parseDateInput } from '@/lib/dates'

export function DateInput({
  id,
  value,
  onChange,
  min,
  disabled = false,
  required = false,
  className = '',
  placeholder = 'DD/MM/YYYY',
}: {
  id?: string
  value: string
  onChange: (iso: string) => void
  min?: string
  disabled?: boolean
  required?: boolean
  className?: string
  placeholder?: string
}) {
  const autoId = useId()
  const fieldId = id ?? autoId
  const pickerId = `${fieldId}-picker`
  const pickerRef = useRef<HTMLInputElement>(null)
  const [text, setText] = useState(() => (value ? formatDate(value) : ''))

  useEffect(() => {
    setText(value ? formatDate(value) : '')
  }, [value])

  function commitText(next: string) {
    const iso = parseDateInput(next)
    if (iso) {
      onChange(iso)
      setText(formatDate(iso))
      return
    }

    if (!next.trim()) {
      onChange('')
      setText('')
      return
    }

    setText(value ? formatDate(value) : '')
  }

  function handlePickerChange(iso: string) {
    onChange(iso)
    setText(iso ? formatDate(iso) : '')
  }

  function openPicker() {
    const picker = pickerRef.current
    if (!picker || disabled) return

    if (typeof picker.showPicker === 'function') {
      try {
        picker.showPicker()
        return
      } catch {
        // showPicker can throw if not triggered by a user gesture in some browsers.
      }
    }

    picker.click()
  }

  return (
    <div className={`date-input-wrap ${className}`.trim()}>
      <input
        id={fieldId}
        type="text"
        inputMode="numeric"
        className="btf-input w-full date-input-text"
        placeholder={placeholder}
        value={text}
        onChange={event => setText(event.target.value)}
        onBlur={() => commitText(text)}
        disabled={disabled}
        required={required}
        autoComplete="off"
        spellCheck={false}
      />
      <div className="date-input-picker-slot">
        <button
          type="button"
          className="date-input-picker-btn"
          onClick={openPicker}
          disabled={disabled}
          tabIndex={-1}
          aria-label="Open calendar"
        >
          <Calendar size={16} strokeWidth={1.75} aria-hidden />
        </button>
        <input
          ref={pickerRef}
          id={pickerId}
          type="date"
          className="date-input-picker"
          value={value}
          min={min}
          onChange={event => handlePickerChange(event.target.value)}
          disabled={disabled}
          tabIndex={-1}
          aria-hidden
        />
      </div>
    </div>
  )
}
