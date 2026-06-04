import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
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

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>
}) {
  const params = await searchParams
  const sent = params.sent === '1'

  async function requestReset(formData: FormData) {
    'use server'
    const email = (formData.get('email') as string)?.trim()
    if (!email) {
      redirect('/auth/forgot-password?error=Enter+your+email+address')
    }

    const supabase = await createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: getPasswordRecoveryRedirectTo(),
    })

    if (error) {
      redirect(`/auth/forgot-password?error=${encodeURIComponent(error.message)}`)
    }

    redirect('/auth/forgot-password?sent=1')
  }

  return (
    <div
      className="min-h-[100dvh] grid-bg grid-bg-fade flex flex-col items-center justify-center px-4"
      style={{ background: 'var(--bg)' }}
    >
      <div className="w-full max-w-[440px] flex flex-col gap-10">
        <Link href="/" className="flex justify-center">
          <Image
            src="/btf-wordmark.svg"
            alt="Below The Fold"
            width={130}
            height={18}
            style={{ height: 17, width: 'auto' }}
            priority
          />
        </Link>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border-2)' }}>
          <div className="px-8 py-7" style={{ borderBottom: '1px solid var(--border)' }}>
            <h1
              className="text-2xl font-medium"
              style={{
                fontFamily: 'var(--font-dm-mono)',
                color: 'var(--text-1)',
                letterSpacing: '0.01em',
              }}
            >
              Reset password
            </h1>
            <p
              className="text-base mt-1.5"
              style={{ fontFamily: 'var(--font-geist)', color: 'var(--text-2)' }}
            >
              {sent
                ? 'If an account exists for that email, we sent a reset link.'
                : 'Enter your email and we will send you a link to choose a new password.'}
            </p>
          </div>

          <div className="px-8 py-8 flex flex-col gap-6">
            {sent ? (
              <>
                <AuthSuccess message="Check your inbox (and spam folder) for the reset link. It expires after a short time." />
                <Link
                  href="/auth/login"
                  className="text-center text-sm hover:opacity-70 transition-opacity"
                  style={{ fontFamily: 'var(--font-dm-mono)', color: 'var(--text-2)' }}
                >
                  ← Back to sign in
                </Link>
              </>
            ) : (
              <form action={requestReset} className="flex flex-col gap-6">
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
                    style={inputStyle}
                    className="placeholder-[#555] focus:[border-color:var(--accent)]"
                  />
                </div>

                {params.error ? <AuthError message={params.error} /> : null}

                <button
                  type="submit"
                  className="btn-primary w-full py-4 text-sm tracking-[0.12em] uppercase cursor-pointer font-medium"
                  style={{
                    fontFamily: 'var(--font-dm-mono)',
                    background: 'var(--accent)',
                    color: 'var(--bg)',
                    border: 'none',
                    borderRadius: 0,
                  }}
                >
                  Send reset link →
                </button>

                <Link
                  href="/auth/login"
                  className="text-center text-sm hover:opacity-70 transition-opacity"
                  style={{ fontFamily: 'var(--font-dm-mono)', color: 'var(--text-3)' }}
                >
                  ← Back to sign in
                </Link>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
