import { redirect, notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PasswordField } from '@/components/auth/PasswordField'
import { AuthError } from '@/components/auth/AuthMessage'
import { formatStaffRole } from '@/lib/team/roles'

export default async function RegisterStaffPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>
}) {
  const params = await searchParams
  const token = params.token
  if (!token) notFound()

  const supabase = await createClient()
  const { data: invite } = await supabase
    .from('staff_invite_tokens')
    .select('id, email, full_name, role, used, expires_at')
    .eq('token', token)
    .single()

  const invalid = !invite || invite.used || new Date(invite.expires_at) < new Date()

  async function register(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const password = formData.get('password') as string

    const { data: inv } = await supabase
      .from('staff_invite_tokens')
      .select('id, email, full_name, role, used, expires_at')
      .eq('token', token as string)
      .single()

    if (!inv || inv.used || new Date(inv.expires_at) < new Date()) {
      redirect(`/auth/register-staff?token=${token}&error=Token+invalid+or+expired`)
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: inv.email,
      password,
      options: { data: { full_name: inv.full_name } },
    })

    if (authError || !authData.user) {
      redirect(
        `/auth/register-staff?token=${token}&error=${encodeURIComponent(authError?.message ?? 'Signup failed')}`
      )
    }

    const role = inv.role === 'admin' ? 'admin' : 'agent'

    const { error: profileError } = await supabase.from('users').insert({
      id: authData.user.id,
      role,
      full_name: inv.full_name,
      client_id: null,
    })

    if (profileError) {
      redirect(
        `/auth/register-staff?token=${token}&error=${encodeURIComponent(profileError.message)}`
      )
    }

    await supabase.from('staff_invite_tokens').update({ used: true }).eq('id', inv.id)
    redirect('/admin/tickets')
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
  } as const

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
            {invalid ? (
              <>
                <h1
                  className="text-2xl font-medium"
                  style={{
                    fontFamily: 'var(--font-dm-mono)',
                    color: 'var(--text-1)',
                    letterSpacing: '0.01em',
                  }}
                >
                  Invalid invite
                </h1>
                <p
                  className="text-base mt-1.5"
                  style={{ fontFamily: 'var(--font-geist)', color: 'var(--text-2)' }}
                >
                  This team invite has expired or already been used.
                </p>
              </>
            ) : (
              <>
                <h1
                  className="text-2xl font-medium"
                  style={{
                    fontFamily: 'var(--font-dm-mono)',
                    color: 'var(--text-1)',
                    letterSpacing: '0.01em',
                  }}
                >
                  Join BTF Support
                </h1>
                <p
                  className="text-base mt-1.5"
                  style={{ fontFamily: 'var(--font-geist)', color: 'var(--text-2)' }}
                >
                  {invite.full_name} · {formatStaffRole(invite.role)} · {invite.email}
                </p>
              </>
            )}
          </div>

          <div className="px-8 py-8">
            {invalid ? (
              <Link
                href="/auth/login"
                className="text-sm hover:opacity-70 transition-opacity"
                style={{ fontFamily: 'var(--font-dm-mono)', color: 'var(--text-3)' }}
              >
                ← Sign in
              </Link>
            ) : (
              <form action={register} className="flex flex-col gap-6">
                <div className="flex flex-col gap-2.5">
                  <label
                    className="text-sm font-medium"
                    style={{ fontFamily: 'var(--font-geist)', color: 'var(--text-1)' }}
                  >
                    Your name
                  </label>
                  <input
                    name="full_name"
                    defaultValue={invite.full_name}
                    readOnly
                    style={inputStyle}
                    className="opacity-80"
                  />
                </div>

                <div className="flex flex-col gap-2.5">
                  <label
                    className="text-sm font-medium"
                    style={{ fontFamily: 'var(--font-geist)', color: 'var(--text-1)' }}
                  >
                    Work email
                  </label>
                  <input
                    name="email"
                    type="email"
                    defaultValue={invite.email}
                    readOnly
                    style={inputStyle}
                    className="opacity-80"
                  />
                </div>

                <PasswordField
                  id="password"
                  label="Password"
                  autoComplete="new-password"
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
                  Create account →
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
