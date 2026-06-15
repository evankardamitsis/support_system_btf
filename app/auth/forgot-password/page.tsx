import Link from 'next/link'
import Image from 'next/image'
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm'

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string; email?: string }>
}) {
  const params = await searchParams
  const prefilledEmail = params.email?.trim() ?? ''
  const initialError = params.error ? decodeURIComponent(params.error.replace(/\+/g, ' ')) : null

  return (
    <div className="auth-shell-content grid-bg grid-bg-fade flex flex-1 flex-col items-center justify-center px-4 py-8 w-full">
      <div className="w-full max-w-[440px] flex flex-col gap-10">
        <Link href="/" className="flex justify-center">
          <Image
            src="/btf-wordmark.svg"
            alt="Below The Fold"
            width={130}
            height={18}
            className="theme-wordmark"
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
              Enter your email and we will send you a link to choose a new password.
            </p>
          </div>

          <div className="px-8 py-8 flex flex-col gap-6">
            <ForgotPasswordForm defaultEmail={prefilledEmail} initialError={initialError} />
          </div>
        </div>
      </div>
    </div>
  )
}
