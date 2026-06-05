'use client'

import { useState, useTransition } from 'react'
import { notifyError, notifySuccess } from '@/lib/notify'

export function ResendConfirmationButton({
  action,
}: {
  action: () => Promise<{ ok: true } | { ok: false; error: string }>
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function resend() {
    setError(null)
    startTransition(async () => {
      const result = await action()
      if (!result.ok) {
        setError(result.error)
        notifyError(result.error)
        return
      }
      notifySuccess('Confirmation email sent — check your inbox')
    })
  }

  return (
    <div className="flex flex-col gap-2 pt-2">
      <button
        type="button"
        className="text-sm hover:opacity-70 transition-opacity cursor-pointer disabled:opacity-50"
        style={{
          fontFamily: 'var(--font-dm-mono)',
          color: 'var(--accent)',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}
        onClick={resend}
        disabled={pending}
      >
        {pending ? 'Sending…' : 'Resend confirmation email'}
      </button>
      {error ? (
        <p className="text-sm" style={{ color: '#f87171', fontFamily: 'var(--font-geist)' }}>
          {error}
        </p>
      ) : null}
    </div>
  )
}
