import { redirect } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function UpdatePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams

  async function updatePassword(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const password = formData.get('password') as string
    const { error } = await supabase.auth.updateUser({ password })
    if (error) redirect(`/auth/update-password?error=${encodeURIComponent(error.message)}`)
    redirect('/')
  }

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
  }

  return (
    <div
      className="min-h-[100dvh] grid-bg grid-bg-fade flex flex-col items-center justify-center px-4"
      style={{ background: 'var(--bg)' }}
    >
      <div className="w-full max-w-[440px] flex flex-col gap-10">
        <Link href="/" className="flex justify-center">
          <Image src="/btf-wordmark.svg" alt="Below The Fold" width={130} height={18} style={{ height: 17, width: 'auto' }} priority />
        </Link>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border-2)' }}>
          <div className="px-8 py-7" style={{ borderBottom: '1px solid var(--border)' }}>
            <h1 className="text-2xl font-medium" style={{ fontFamily: 'var(--font-dm-mono)', color: 'var(--text-1)', letterSpacing: '0.01em' }}>
              Set your password
            </h1>
            <p className="text-base mt-1.5" style={{ fontFamily: 'var(--font-geist)', color: 'var(--text-2)' }}>
              Choose a secure password to protect your account.
            </p>
          </div>

          <form action={updatePassword} className="px-8 py-8 flex flex-col gap-6">
            <div className="flex flex-col gap-2.5">
              <label htmlFor="password" className="text-sm font-medium" style={{ fontFamily: 'var(--font-geist)', color: 'var(--text-1)' }}>
                New password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                autoFocus
                placeholder="Min. 8 characters"
                style={inputStyle}
                className="placeholder-[#555] focus:[border-color:var(--accent)]"
              />
            </div>

            {params.error && (
              <div className="px-4 py-3" style={{ background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.3)', color: 'var(--danger)', fontFamily: 'var(--font-geist)', fontSize: 14 }}>
                {params.error}
              </div>
            )}

            <button
              type="submit"
              className="btn-primary w-full py-4 text-sm tracking-[0.12em] uppercase cursor-pointer font-medium"
              style={{ fontFamily: 'var(--font-dm-mono)', background: 'var(--accent)', color: 'var(--bg)', border: 'none', borderRadius: 0 }}
            >
              Set password →
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
