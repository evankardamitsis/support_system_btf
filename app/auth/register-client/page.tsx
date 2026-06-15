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
import { clearPendingClientTeamInvites } from '@/lib/client-team/invite-cleanup'
import { ResendConfirmationButton } from '@/components/auth/ResendConfirmationButton'
import {
  loadClientTeamInviteByToken,
  resolveClientTeamInviteLanding,
} from '@/lib/auth/client-team-invite-status'
import { findAuthUserByEmail } from '@/lib/team/auth-users'

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
  const invite = await loadClientTeamInviteByToken(supabase, token)
  const landing = await resolveClientTeamInviteLanding(invite, showCheckEmail)

  const { data: client } =
    invite && landing.kind !== 'invalid'
      ? await supabase.from('clients').select('name').eq('id', invite.client_id).single()
      : { data: null }
  const clientName = client?.name ?? null

  async function register(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const password = formData.get('password') as string

    const inv = await loadClientTeamInviteByToken(supabase, token as string)

    if (!inv || new Date(inv.expires_at) < new Date()) {
      redirect(`/auth/register-client?token=${token}&error=Token+invalid+or+expired`)
    }

    const admin = createAdminClient()
    if (inv.used) {
      const existing = await findAuthUserByEmail(admin, inv.email)
      if (existing?.email_confirmed_at) {
        redirect(`/auth/login?email=${encodeURIComponent(inv.email)}`)
      }
    }

    const authResult = await registerInvitedAuthUser({
      supabase,
      admin,
      email: inv.email,
      password,
      fullName: inv.full_name,
    })

    if (!authResult.ok) {
      if (authResult.alreadyConfirmed) {
        redirect(`/auth/login?email=${encodeURIComponent(inv.email)}`)
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

    try {
      await clearPendingClientTeamInvites(admin, inv.client_id, inv.email)
    } catch {
      // finalizeRegistration also clears on confirmed login.
    }
    await finalizeRegistration(supabase)
    redirect('/portal/tickets')
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

  const title =
    landing.kind === 'sign_in'
      ? 'Account ready'
      : landing.kind === 'invalid'
        ? 'Invalid invite'
        : landing.kind === 'check_email'
          ? 'Confirm your email'
          : 'Join your team'

  const subtitle =
    landing.kind === 'sign_in'
      ? landing.reason === 'invite_expired'
        ? 'This invite link has expired, but your account is already set up.'
        : 'You already joined the team — sign in to access the portal.'
      : landing.kind === 'invalid'
        ? 'This link has expired or is no longer valid.'
        : landing.kind === 'check_email'
          ? 'One more step before you can access the portal.'
          : clientName
            ? null
            : null

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
              {title}
            </h1>
            {subtitle ? (
              <p
                className="text-base mt-1.5"
                style={{ fontFamily: 'var(--font-geist)', color: 'var(--text-2)' }}
              >
                {subtitle}
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
            {landing.kind === 'sign_in' ? (
              <div className="flex flex-col gap-5">
                <p
                  className="text-base"
                  style={{ fontFamily: 'var(--font-geist)', color: 'var(--text-2)' }}
                >
                  Use <strong>{landing.email}</strong> at the sign-in page.
                  {!landing.confirmed
                    ? ' If you have not confirmed your email yet, check your inbox or use resend below.'
                    : null}
                </p>
                <Link
                  href={`/auth/login?email=${encodeURIComponent(landing.email)}`}
                  className="btn-primary w-full py-4 text-sm tracking-[0.12em] uppercase cursor-pointer font-medium text-center"
                  style={{
                    fontFamily: 'var(--font-dm-mono)',
                    background: 'var(--accent)',
                    color: 'var(--primary-foreground)',
                    border: 'none',
                    borderRadius: 0,
                    textDecoration: 'none',
                  }}
                >
                  Go to sign in →
                </Link>
                <Link
                  href={`/auth/forgot-password?email=${encodeURIComponent(landing.email)}`}
                  className="text-center text-sm hover:opacity-70 transition-opacity"
                  style={{ fontFamily: 'var(--font-dm-mono)', color: 'var(--text-2)' }}
                >
                  Forgot password?
                </Link>
                {!landing.confirmed ? (
                  <ResendConfirmationButton
                    action={() => resendClientTeamSignupConfirmation(token as string)}
                  />
                ) : null}
              </div>
            ) : landing.kind === 'invalid' ? (
              <div className="flex flex-col gap-5">
                <p
                  className="text-base"
                  style={{ fontFamily: 'var(--font-geist)', color: 'var(--text-2)' }}
                >
                  Ask your team admin to send a new invite link, or sign in if you already registered.
                </p>
                <Link
                  href="/auth/login"
                  className="text-sm hover:opacity-70 transition-opacity"
                  style={{ fontFamily: 'var(--font-dm-mono)', color: 'var(--text-2)' }}
                >
                  Go to sign in →
                </Link>
                <Link
                  href="/"
                  className="text-sm hover:opacity-70 transition-opacity"
                  style={{ fontFamily: 'var(--font-dm-mono)', color: 'var(--text-2)' }}
                >
                  ← Return home
                </Link>
              </div>
            ) : landing.kind === 'check_email' ? (
              <>
                <EmailConfirmationMessage email={landing.email} clientName={clientName} />
                <ResendConfirmationButton
                  action={() => resendClientTeamSignupConfirmation(token as string)}
                />
                <Link
                  href={`/auth/login?email=${encodeURIComponent(landing.email)}`}
                  className="mt-4 block text-center text-sm hover:opacity-70 transition-opacity"
                  style={{ fontFamily: 'var(--font-dm-mono)', color: 'var(--text-2)' }}
                >
                  Already confirmed? Sign in →
                </Link>
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
                    color: 'var(--primary-foreground)',
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
