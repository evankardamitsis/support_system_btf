'use client'

import { useState } from 'react'

export function CopyInput({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className="flex items-stretch expand-in"
      style={{ border: '1px solid var(--border)' }}
    >
      <input
        readOnly
        value={value}
        className="flex-1 px-3 py-2 text-xs bg-transparent outline-none"
        style={{
          color: 'var(--text-2)',
          fontFamily: 'var(--font-dm-mono)',
          minWidth: 0,
        }}
      />
      <button
        onClick={handleCopy}
        className="px-4 text-[10px] tracking-[0.1em] uppercase cursor-pointer transition-colors duration-150"
        style={{
          fontFamily: 'var(--font-dm-mono)',
          background: copied ? 'var(--success)' : 'var(--surface-2)',
          color: copied ? 'var(--bg)' : 'var(--text-2)',
          borderLeft: '1px solid var(--border)',
          borderRadius: 0,
        }}
      >
        {copied ? 'COPIED' : 'COPY'}
      </button>
    </div>
  )
}
