import { redirect } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getPostLoginPath } from '@/lib/auth/post-login'
import { PasswordField } from '@/components/auth/PasswordField'
import { AuthError } from '@/components/auth/AuthMessage'

export default async function UpdatePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login?error=Sign+in+with+your+reset+link+first')
  }

  async function updatePassword(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const password = formData.get('password') as string
    const { error } = await supabase.auth.updateUser({ password })
    if (error) redirect(`/auth/update-password?error=${encodeURIComponent(error.message)}`)
    redirect(await getPostLoginPath(supabase))
  }

  return (
    <div className="auth-shell-content grid-bg grid-bg-fade flex flex-1 flex-col items-center justify-center px-4 py-8 w-full">
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
              Set new password
            </h1>
            <p
              className="text-base mt-1.5"
              style={{ fontFamily: 'var(--font-geist)', color: 'var(--text-2)' }}
            >
              Choose a secure password for your account.
            </p>
          </div>

          <form action={updatePassword} className="px-8 py-8 flex flex-col gap-6">
            <PasswordField
              id="password"
              name="password"
              label="New password"
              autoComplete="new-password"
              autoFocus
            />

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
              Save password →
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
