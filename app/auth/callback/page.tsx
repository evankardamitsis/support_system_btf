'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { completeAuthRedirect } from '@/app/actions/auth'

function isRecoveryFlow(type: string | null, next: string | null): boolean {
  return type === 'recovery' || next === '/auth/update-password'
}

export default function AuthCallbackPage() {
  const router = useRouter()
  const started = useRef(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (started.current) return
    started.current = true

    async function handleCallback() {
      const supabase = createClient()
      const url = new URL(window.location.href)
      const search = url.searchParams
      const hash = new URLSearchParams(url.hash.replace(/^#/, ''))

      const next = search.get('next')
      const tokenHash = search.get('token_hash')
      const type = search.get('type')
      const code = search.get('code')

      const hashError = hash.get('error')
      if (hashError) {
        router.replace(
          `/auth/login?error=${encodeURIComponent(hash.get('error_description') ?? hashError)}`
        )
        return
      }

      if (tokenHash && type) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type as EmailOtpType,
        })
        if (error) {
          router.replace(
            `/auth/login?error=${encodeURIComponent('Link expired or invalid. Request a new one.')}`
          )
          return
        }
        if (isRecoveryFlow(type, next)) {
          router.replace('/auth/update-password')
          return
        }
        router.replace(await completeAuthRedirect())
        return
      }

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) {
          const hint =
            error.message.toLowerCase().includes('code verifier') ||
            error.message.toLowerCase().includes('pkce')
              ? 'Open the reset link in the same browser where you requested it, or ask your admin to update the Supabase reset email template.'
              : 'Link expired or invalid. Request a new one.'
          router.replace(`/auth/login?error=${encodeURIComponent(hint)}`)
          return
        }
        const flowType = type ?? hash.get('type')
        if (isRecoveryFlow(flowType, next)) {
          router.replace('/auth/update-password')
          return
        }
        router.replace(await completeAuthRedirect())
        return
      }

      const accessToken = hash.get('access_token')
      const refreshToken = hash.get('refresh_token')
      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
        if (error) {
          router.replace(`/auth/login?error=${encodeURIComponent(error.message)}`)
          return
        }
        const flowType = type ?? hash.get('type')
        if (isRecoveryFlow(flowType, next)) {
          router.replace('/auth/update-password')
          return
        }
        router.replace(await completeAuthRedirect())
        return
      }

      setFailed(true)
    }

    void handleCallback()
  }, [router])

  if (failed) {
    return (
      <div className="auth-shell-content flex flex-1 flex-col items-center justify-center gap-4 w-full px-4">
        <p
          className="text-sm leading-relaxed text-center max-w-sm"
          style={{ color: 'var(--text-2)' }}
        >
          This link is invalid or has expired. Request a new password reset.
        </p>
        <div className="flex flex-col gap-2 text-sm text-center">
          <Link href="/auth/forgot-password" style={{ color: 'var(--accent)' }}>
            Forgot password
          </Link>
          <Link href="/auth/login" style={{ color: 'var(--text-2)' }}>
            Back to sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-shell-content flex flex-1 flex-col items-center justify-center gap-4 w-full">
      <div className="flex items-center gap-3">
        <span
          className="inline-block w-4 h-4 border-2 rounded-full animate-spin"
          style={{ borderColor: 'var(--border-2)', borderTopColor: 'var(--text-2)' }}
        />
        <span className="text-sm" style={{ color: 'var(--text-2)' }}>
          Signing you in…
        </span>
      </div>
    </div>
  )
}
