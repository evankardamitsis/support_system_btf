'use client'

import { useFormStatus } from 'react-dom'

export function SignInButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="btn-primary w-full py-4 text-sm tracking-[0.12em] uppercase cursor-pointer font-medium inline-flex items-center justify-center gap-2.5 disabled:opacity-70 disabled:cursor-wait"
      style={{
        fontFamily: 'var(--font-dm-mono)',
        background: 'var(--accent)',
        color: 'var(--bg)',
        border: 'none',
        borderRadius: 0,
      }}
    >
      {pending ? (
        <>
          <span
            className="inline-block w-4 h-4 border-2 rounded-full animate-spin shrink-0"
            style={{ borderColor: 'var(--bg)', borderTopColor: 'transparent', opacity: 0.85 }}
            aria-hidden
          />
          Signing in…
        </>
      ) : (
        'Sign in →'
      )}
    </button>
  )
}
