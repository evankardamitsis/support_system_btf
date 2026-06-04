'use client'

import { useId, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

const inputStyle: React.CSSProperties = {
  background: 'var(--surface-2)',
  border: '1px solid var(--border-2)',
  color: 'var(--text-1)',
  fontFamily: 'var(--font-geist)',
  fontSize: 16,
  padding: '14px 2.75rem 14px 16px',
  outline: 'none',
  borderRadius: 0,
  width: '100%',
  transition: 'border-color 150ms ease',
}

export function PasswordField({
  id: idProp,
  name = 'password',
  label,
  showLabel = true,
  required = true,
  minLength = 8,
  autoComplete,
  placeholder = 'Min. 8 characters',
  autoFocus,
}: {
  id?: string
  name?: string
  label?: string
  showLabel?: boolean
  required?: boolean
  minLength?: number
  autoComplete?: string
  placeholder?: string
  autoFocus?: boolean
}) {
  const generatedId = useId()
  const id = idProp ?? generatedId
  const [visible, setVisible] = useState(false)

  return (
    <div className="flex flex-col gap-2.5">
      {showLabel && label ? (
        <label
          htmlFor={id}
          className="text-sm font-medium"
          style={{ fontFamily: 'var(--font-geist)', color: 'var(--text-1)' }}
        >
          {label}
        </label>
      ) : null}
      <div className="auth-password-wrap">
        <input
          id={id}
          name={name}
          type={visible ? 'text' : 'password'}
          required={required}
          minLength={minLength}
          autoComplete={autoComplete}
          placeholder={placeholder}
          autoFocus={autoFocus}
          style={inputStyle}
          className="placeholder-[#555] focus:[border-color:var(--accent)]"
        />
        <button
          type="button"
          className="auth-password-toggle"
          onClick={() => setVisible(v => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          tabIndex={-1}
        >
          {visible ? <EyeOff size={18} strokeWidth={1.75} /> : <Eye size={18} strokeWidth={1.75} />}
        </button>
      </div>
    </div>
  )
}
