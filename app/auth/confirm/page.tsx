'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { completeAuthRedirect } from '@/app/actions/auth'

export default function AuthConfirmPage() {
  const router = useRouter()
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    const search = new URLSearchParams(window.location.search)
    const tokenHash = search.get('token_hash')
    const searchType = search.get('type')

    if (tokenHash && searchType) {
      router.replace(`/auth/callback?${search.toString()}`)
      return
    }

    const hash = window.location.hash.substring(1)
    const params = new URLSearchParams(hash)

    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')
    const type = params.get('type')
    const error = params.get('error')
    const errorDescription = params.get('error_description')

    if (error) {
      router.replace(`/auth/login?error=${encodeURIComponent(errorDescription ?? error)}`)
      return
    }

    if (accessToken && refreshToken) {
      const supabase = createClient()
      void supabase.auth
        .setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(async () => {
          if (type === 'recovery') {
            router.replace('/auth/update-password')
            return
          }
          const path = await completeAuthRedirect()
          router.replace(path)
        })
      return
    }

    const timer = window.setTimeout(() => setTimedOut(true), 8000)
    return () => window.clearTimeout(timer)
  }, [router])

  return (
    <div className="auth-shell-content flex flex-1 flex-col items-center justify-center gap-4 w-full">
      <div className="flex items-center gap-2">
        <span
          className="text-xs tracking-[0.2em] uppercase"
          style={{ fontFamily: 'var(--font-dm-mono)', color: 'var(--text-2)' }}
        >
          BTF
        </span>
        <span className="w-px h-3" style={{ background: 'var(--border-2)' }} />
        <span className="text-xs tracking-wide" style={{ color: 'var(--text-2)' }}>
          Support
        </span>
      </div>
      {timedOut ? (
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>
            This link is invalid or has expired. Request a new password reset or sign-in link.
          </p>
          <div className="flex flex-col gap-2 text-sm">
            <Link href="/auth/forgot-password" style={{ color: 'var(--accent)' }}>
              Forgot password
            </Link>
            <Link href="/auth/login" style={{ color: 'var(--text-2)' }}>
              Back to sign in
            </Link>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <span
            className="inline-block w-4 h-4 border-2 rounded-full animate-spin"
            style={{ borderColor: 'var(--border-2)', borderTopColor: 'var(--text-2)' }}
          />
          <span className="text-sm" style={{ color: 'var(--text-2)' }}>
            Signing you in…
          </span>
        </div>
      )}
    </div>
  )
}
