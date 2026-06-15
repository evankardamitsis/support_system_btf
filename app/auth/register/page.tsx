import { redirect, notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PasswordField } from '@/components/auth/PasswordField'
import { AuthError } from '@/components/auth/AuthMessage'
import { EmailConfirmationMessage } from '@/components/auth/EmailConfirmationMessage'
import { finalizeRegistration } from '@/lib/auth/finalize-registration'
import { registerInvitedPortalUser } from '@/lib/auth/register-invited-user'

export default async function RegisterPage({
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
    .from('invite_tokens')
    .select('id, client_id, used, expires_at')
    .eq('token', token)
    .single()

  const invalid = !invite || invite.used || new Date(invite.expires_at) < new Date()

  const { data: client } = !invalid
    ? await supabase.from('clients').select('name, email').eq('id', invite.client_id).single()
    : { data: null }

  async function register(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const fullName = formData.get('full_name') as string
    const password = formData.get('password') as string

    const { data: inv } = await supabase
      .from('invite_tokens')
      .select('id, client_id, used, expires_at')
      .eq('token', token as string)
      .single()

    if (!inv || inv.used || new Date(inv.expires_at) < new Date()) {
      redirect(`/auth/register?token=${token}&error=Token+invalid+or+expired`)
    }

    const { data: clientData } = await supabase
      .from('clients')
      .select('email')
      .eq('id', inv.client_id)
      .single()
    if (!clientData) redirect(`/auth/register?token=${token}&error=Client+not+found`)

    const admin = createAdminClient()
    const authResult = await registerInvitedPortalUser({
      supabase,
      admin,
      email: clientData.email,
      password,
      fullName,
    })

    if (!authResult.ok) {
      if (authResult.alreadyConfirmed) {
        redirect(`/auth/login?email=${encodeURIComponent(clientData.email)}`)
      }
      redirect(`/auth/register?token=${token}&error=${encodeURIComponent(authResult.error)}`)
    }

    const { error: profileError } = await admin.from('users').upsert(
      {
        id: authResult.userId,
        role: 'client',
        client_id: inv.client_id,
        full_name: fullName,
      },
      { onConflict: 'id' }
    )

    if (profileError) {
      redirect(
        `/auth/register?token=${token}&error=${encodeURIComponent(profileError.message)}`
      )
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
  }

  const panelTitle = invalid
    ? 'Invalid invite'
    : showCheckEmail
      ? 'Confirm your email'
      : 'Create account'

  const panelSubtitle = invalid
    ? 'This link has expired or already been used.'
    : showCheckEmail
      ? 'One more step before you can access your portal.'
      : client?.name
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
              {panelTitle}
            </h1>
            {invalid ? (
              <p
                className="text-base mt-1.5"
                style={{ fontFamily: 'var(--font-geist)', color: 'var(--text-2)' }}
              >
                {panelSubtitle}
              </p>
            ) : showCheckEmail ? (
              <p
                className="text-base mt-1.5"
                style={{ fontFamily: 'var(--font-geist)', color: 'var(--text-2)' }}
              >
                {panelSubtitle}
              </p>
            ) : client?.name ? (
              <p
                className="text-base mt-1.5"
                style={{ fontFamily: 'var(--font-geist)', color: 'var(--text-2)' }}
              >
                Invited to join{' '}
                <span style={{ color: 'var(--accent)', fontWeight: 500 }}>{client.name}</span>.
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
                  Contact your BTF account manager to receive a new invite link.
                </p>
                <Link
                  href="/"
                  className="text-sm hover:opacity-70 transition-opacity"
                  style={{ fontFamily: 'var(--font-dm-mono)', color: 'var(--text-2)' }}
                >
                  ← Return home
                </Link>
              </div>
            ) : showCheckEmail && client?.email ? (
              <EmailConfirmationMessage email={client.email} clientName={client.name} />
            ) : (
              <form action={register} className="flex flex-col gap-6">
                <div className="flex flex-col gap-2.5">
                  <label
                    htmlFor="full_name"
                    className="text-sm font-medium"
                    style={{ fontFamily: 'var(--font-geist)', color: 'var(--text-1)' }}
                  >
                    Full name
                  </label>
                  <input
                    id="full_name"
                    name="full_name"
                    required
                    placeholder="Maria Papadopoulou"
                    style={inputStyle}
                    className="focus:[border-color:var(--accent)]"
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
