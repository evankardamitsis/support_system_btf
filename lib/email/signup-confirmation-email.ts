import type { SupabaseClient } from '@supabase/supabase-js'
import { buildEmailAuthCallbackUrl } from '@/lib/auth/redirect-url'
import { findAuthUserByEmail } from '@/lib/team/auth-users'
import { emailShell, type PortalEmailResult } from '@/lib/email/email-shell'
import { sendEmail } from '@/lib/email/send'

/** Legacy resend for accounts stuck awaiting Supabase confirmation before auto-confirm shipped. */
export async function sendSignupConfirmationEmailViaZepto(
  admin: SupabaseClient,
  email: string
): Promise<PortalEmailResult> {
  const normalized = email.trim().toLowerCase()
  const existing = await findAuthUserByEmail(admin, normalized)

  if (!existing) {
    return {
      sent: false,
      error: 'No account found for this email yet. Complete registration from your invite link first.',
    }
  }

  if (existing.email_confirmed_at) {
    return { sent: false, error: 'This email is already confirmed. Sign in at /auth/login.' }
  }

  const { data, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: normalized,
  })

  if (error) {
    console.error('[email] signup confirmation generateLink failed:', error.message)
    return { sent: false, error: 'Could not create confirmation link. Try again later.' }
  }

  const tokenHash = data?.properties?.hashed_token
  if (!tokenHash) {
    return { sent: false, error: 'Could not create confirmation link. Try again later.' }
  }

  const confirmUrl = buildEmailAuthCallbackUrl(tokenHash, 'magiclink')

  const sent = await sendEmail({
    to: normalized,
    subject: 'Confirm your BTF Support account',
    html: emailShell(
      'Confirm your email',
      'Follow the link below to confirm your email address and finish signing up. This link expires after a short time.',
      'Confirm email',
      confirmUrl
    ),
  })

  if (!sent.ok) {
    return { sent: false, error: sent.error }
  }

  return { sent: true }
}
