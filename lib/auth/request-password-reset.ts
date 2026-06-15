import { buildPasswordRecoveryCallbackUrl } from '@/lib/auth/redirect-url'
import { sendPasswordRecoveryEmail } from '@/lib/email/password-recovery'
import { tryCreateAdminClient } from '@/lib/supabase/admin'

export type RequestPasswordResetResult =
  | { ok: true }
  | { ok: false; error: string }

function isUnknownUserError(message: string): boolean {
  return /user not found|no such user|not found/i.test(message)
}

/** Send a password reset link via ZeptoMail (token_hash, works in any browser). */
export async function requestPasswordReset(email: string): Promise<RequestPasswordResetResult> {
  const normalized = email.trim().toLowerCase()
  if (!normalized || !normalized.includes('@')) {
    return { ok: false, error: 'Enter a valid email address' }
  }

  const adminResult = tryCreateAdminClient()
  if ('error' in adminResult) {
    console.error('[auth] password reset: admin client unavailable:', adminResult.error)
    return { ok: false, error: 'Password reset is temporarily unavailable. Try again later.' }
  }

  const { data, error } = await adminResult.client.auth.admin.generateLink({
    type: 'recovery',
    email: normalized,
  })

  if (error) {
    if (isUnknownUserError(error.message)) {
      return { ok: true }
    }
    console.error('[auth] password reset generateLink failed:', error.message)
    return { ok: false, error: 'Could not send reset email. Try again later.' }
  }

  const tokenHash = data?.properties?.hashed_token
  if (!tokenHash) {
    console.error('[auth] password reset: generateLink returned no hashed_token')
    return { ok: true }
  }

  const resetUrl = buildPasswordRecoveryCallbackUrl(tokenHash)
  const emailResult = await sendPasswordRecoveryEmail({ to: normalized, resetUrl })

  if (!emailResult.sent) {
    console.error('[auth] password reset email failed:', emailResult.error)
    return {
      ok: false,
      error:
        emailResult.error ||
        'Reset link could not be sent. Check ZEPTOMAIL_API_KEY and EMAIL_FROM.',
    }
  }

  return { ok: true }
}
