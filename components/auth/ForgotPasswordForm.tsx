'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getPasswordRecoveryRedirectTo } from '@/lib/auth/redirect-url'
import { AuthError, AuthSuccess } from '@/components/auth/AuthMessage'

const inputStyle = {
  background: 'var(--surface-2)',
  border: '1px solid var(--border-2)',
  color: 'var(--text-1)',
  fontFamily: 'var(--font-geist)',
  fontSize: 16,
  padding: '14px 16px',
  outline: 'none',
  borderRadius: 0,
  width: '100%',
  transition: 'border-color 150ms ease',
} as const

export function ForgotPasswordForm({
  defaultEmail = '',
  initialError = null,
}: {
  defaultEmail?: string
  initialError?: string | null
}) {
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(initialError)
  const [pending, startTransition] = useTransition()

  function requestReset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const email = (form.elements.namedItem('email') as HTMLInputElement).value.trim()
    if (!email) {
      setError('Enter your email address')
      return
    }

    setError(null)
    startTransition(async () => {
      const supabase = createClient()
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: getPasswordRecoveryRedirectTo(),
      })

      if (resetError) {
        setError(resetError.message)
        return
      }

      setSent(true)
    })
  }

  if (sent) {
    return (
      <>
        <AuthSuccess message="Check your inbox (and spam folder) for the reset link. It expires after a short time." />
        <p
          className="text-sm leading-relaxed"
          style={{ fontFamily: 'var(--font-geist)', color: 'var(--text-2)' }}
        >
          Open the link in the same browser where you requested the reset when possible.
        </p>
        <Link
          href="/auth/login"
          className="text-center text-sm hover:opacity-70 transition-opacity"
          style={{ fontFamily: 'var(--font-dm-mono)', color: 'var(--text-2)' }}
        >
          ← Back to sign in
        </Link>
      </>
    )
  }

  return (
    <form onSubmit={requestReset} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2.5">
        <label
          htmlFor="email"
          className="text-sm font-medium"
          style={{ fontFamily: 'var(--font-geist)', color: 'var(--text-1)' }}
        >
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          defaultValue={defaultEmail}
          style={inputStyle}
          className="focus:border-(--accent)"
          disabled={pending}
        />
      </div>

      {error ? <AuthError message={error} /> : null}

      <button
        type="submit"
        className="btn-primary w-full py-4 text-sm tracking-[0.12em] uppercase cursor-pointer font-medium disabled:opacity-60"
        style={{
          fontFamily: 'var(--font-dm-mono)',
          background: 'var(--accent)',
          color: 'var(--primary-foreground)',
          border: 'none',
          borderRadius: 0,
        }}
        disabled={pending}
      >
        {pending ? 'Sending…' : 'Send reset link →'}
      </button>

      <Link
        href="/auth/login"
        className="text-center text-sm hover:opacity-70 transition-opacity"
        style={{ fontFamily: 'var(--font-dm-mono)', color: 'var(--text-2)' }}
      >
        ← Back to sign in
      </Link>
    </form>
  )
}
