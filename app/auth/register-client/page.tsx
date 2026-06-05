import { redirect, notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PasswordField } from '@/components/auth/PasswordField'
import { AuthError } from '@/components/auth/AuthMessage'
import { EmailConfirmationMessage } from '@/components/auth/EmailConfirmationMessage'
import { resendClientTeamSignupConfirmation } from '@/app/actions/register-client'
import { finalizeRegistration } from '@/lib/auth/finalize-registration'
import { registerInvitedAuthUser } from '@/lib/auth/signup-confirmation'
import { ResendConfirmationButton } from '@/components/auth/ResendConfirmationButton'

export default async function RegisterClientPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string; check_email?: string }>
}) {
  const params = await searchParams
  const token = params.token
  if (!token) notFound()

  const showCheckEmail = params.check_email === '1' || params.check_email === 'true'

  const supabase = await createClient()
  const { data: invite } = await supabase
    .from('client_invite_tokens')
    .select('id, client_id, email, full_name, used, expires_at')
    .eq('token', token)
    .single()

  const expired = !invite || new Date(invite.expires_at) < new Date()
  const invalid = expired || (!showCheckEmail && (!invite || invite.used))

  const { data: client } =
    !invalid && invite
      ? await supabase.from('clients').select('name').eq('id', invite.client_id).single()
      : { data: null }
  const clientName = client?.name ?? null

  async function register(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const password = formData.get('password') as string

    const { data: inv } = await supabase
      .from('client_invite_tokens')
      .select('id, client_id, email, full_name, used, expires_at')
      .eq('token', token as string)
      .single()

    if (!inv || inv.used || new Date(inv.expires_at) < new Date()) {
      redirect(`/auth/register-client?token=${token}&error=Token+invalid+or+expired`)
    }

    const admin = createAdminClient()
    const authResult = await registerInvitedAuthUser({
      supabase,
      admin,
      email: inv.email,
      password,
      fullName: inv.full_name,
    })

    if (!authResult.ok) {
      if (authResult.alreadyConfirmed) {
        redirect(`/auth/register-client?token=${token}&error=${encodeURIComponent(authResult.error)}`)
      }
      redirect(`/auth/register-client?token=${token}&error=${encodeURIComponent(authResult.error)}`)
    }

    const { error: profileError } = await admin.from('users').upsert(
      {
        id: authResult.userId,
        role: 'client',
        client_id: inv.client_id,
        full_name: inv.full_name,
      },
      { onConflict: 'id' }
    )

    if (profileError) {
      redirect(`/auth/register-client?token=${token}&error=${encodeURIComponent(profileError.message)}`)
    }

    if (authResult.session) {
      await finalizeRegistration(supabase)
      redirect('/portal/tickets')
    }

    redirect(`/auth/register-client?token=${token}&check_email=1`)
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
      data-theme="auth"
      className="min-h-dvh grid-bg grid-bg-fade flex flex-col items-center justify-center px-4"
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
              {invalid ? 'Invalid invite' : showCheckEmail ? 'Confirm your email' : 'Join your team'}
            </h1>
            {invalid ? (
              <p
                className="text-base mt-1.5"
                style={{ fontFamily: 'var(--font-geist)', color: 'var(--text-2)' }}
              >
                This link has expired or already been used.
              </p>
            ) : showCheckEmail ? (
              <p
                className="text-base mt-1.5"
                style={{ fontFamily: 'var(--font-geist)', color: 'var(--text-2)' }}
              >
                One more step before you can access the portal.
              </p>
            ) : clientName ? (
              <p
                className="text-base mt-1.5"
                style={{ fontFamily: 'var(--font-geist)', color: 'var(--text-2)' }}
              >
                Invited to join{' '}
                <span style={{ color: 'var(--accent)', fontWeight: 500 }}>{clientName}</span>.
              </p>
            ) : null}
          </div>

          <div className="px-8 py-8">
            {invalid ? (
              <div className="flex flex-col gap-5">
                <p
                  className="text-base"
                  style={{ fontFamily: 'var(--font-geist)', color: 'var(--text-2)' }}
                >
                  Ask your team admin to send a new invite link.
                </p>
                <Link
                  href="/"
                  className="text-sm hover:opacity-70 transition-opacity"
                  style={{ fontFamily: 'var(--font-dm-mono)', color: 'var(--text-2)' }}
                >
                  ← Return home
                </Link>
              </div>
            ) : showCheckEmail && invite?.email ? (
              <>
                <EmailConfirmationMessage email={invite.email} clientName={clientName} />
                <ResendConfirmationButton
                  action={() => resendClientTeamSignupConfirmation(token as string)}
                />
              </>
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
                    value={invite?.full_name ?? ''}
                    readOnly
                    className="opacity-80"
                    style={inputStyle}
                  />
                </div>

                <div className="flex flex-col gap-2.5">
                  <label
                    className="text-sm font-medium"
                    style={{ fontFamily: 'var(--font-geist)', color: 'var(--text-1)' }}
                  >
                    Email
                  </label>
                  <input
                    value={invite?.email ?? ''}
                    readOnly
                    className="opacity-80"
                    style={inputStyle}
                  />
                </div>

                <PasswordField
                  id="password"
                  name="password"
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
