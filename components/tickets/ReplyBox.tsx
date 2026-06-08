'use client'

import { useRef, useState } from 'react'

interface ReplyBoxProps {
  onSubmit: (body: string, isInternal: boolean) => Promise<void>
  showInternalToggle?: boolean
}

export function ReplyBox({ onSubmit, showInternalToggle = false }: ReplyBoxProps) {
  const [isInternal, setIsInternal] = useState(false)
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLTextAreaElement>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const body = ref.current?.value.trim()
    if (!body) return
    setLoading(true)
    await onSubmit(body, isInternal)
    if (ref.current) ref.current.value = ''
    setIsInternal(false)
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {showInternalToggle && (
        <label
          className="flex items-center gap-2 cursor-pointer self-start"
          style={{ fontFamily: 'var(--font-dm-mono)' }}
        >
          <div
            onClick={() => setIsInternal(!isInternal)}
            className="w-4 h-4 flex items-center justify-center cursor-pointer"
            style={{
              border: `1px solid ${isInternal ? 'var(--warning)' : 'var(--border-2)'}`,
              background: isInternal ? 'var(--warning)' : 'transparent',
            }}
          >
            {isInternal && (
              <span className="text-[8px]" style={{ color: 'var(--primary-foreground)' }}>✓</span>
            )}
          </div>
          <span
            className="text-[10px] tracking-[0.1em] uppercase"
            style={{ color: isInternal ? 'var(--warning)' : 'var(--text-3)' }}
          >
            INTERNAL NOTE
          </span>
        </label>
      )}

      <textarea
        ref={ref}
        required
        rows={4}
        placeholder={isInternal ? 'Internal note — not visible to client' : 'Write a reply…'}
        className="w-full px-3 py-2.5 text-sm resize-y outline-none transition-colors duration-150"
        style={{
          background: 'var(--surface)',
          border: `1px solid ${isInternal ? 'var(--warning)' : 'var(--border)'}`,
          color: 'var(--text-1)',
          fontFamily: 'var(--font-geist)',
          borderRadius: 0,
          minHeight: 96,
        }}
        onFocus={e => {
          e.target.style.borderColor = isInternal ? 'var(--warning)' : 'var(--accent)'
        }}
        onBlur={e => {
          e.target.style.borderColor = isInternal ? 'var(--warning)' : 'var(--border)'
        }}
      />

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="btn-primary px-5 py-2 text-[11px] tracking-[0.12em] uppercase cursor-pointer disabled:opacity-50"
          style={{
            fontFamily: 'var(--font-dm-mono)',
            background: isInternal ? 'var(--warning)' : 'var(--accent)',
            color: 'var(--primary-foreground)',
            border: 'none',
            borderRadius: 0,
          }}
        >
          {loading ? '...' : isInternal ? 'POST NOTE →' : 'SEND →'}
        </button>
      </div>
    </form>
  )
}
