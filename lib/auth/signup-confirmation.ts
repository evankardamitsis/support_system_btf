import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { getSignupEmailRedirectTo } from '@/lib/auth/redirect-url'
import { findAuthUserByEmail } from '@/lib/team/auth-users'

export function isAlreadyRegisteredAuthError(message: string): boolean {
  return /already (registered|exists)/i.test(message)
}

/** Supabase Auth throttles signup confirmation resends (~1 per minute). */
export function isAuthEmailRateLimitError(message: string): boolean {
  return (
    /only request this after/i.test(message) ||
    /rate limit/i.test(message) ||
    /email rate limit exceeded/i.test(message)
  )
}

/** Ask Supabase Auth to send (or resend) the signup confirmation email. */
export async function sendSignupConfirmationEmail(
  supabase: SupabaseClient<Database>,
  email: string
): Promise<string | null> {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: email.trim().toLowerCase(),
    options: {
      emailRedirectTo: getSignupEmailRedirectTo(),
    },
  })

  if (error) {
    return error.message
  }

  return null
}

type RegisterInvitedAuthUserInput = {
  supabase: SupabaseClient<Database>
  admin: SupabaseClient<Database>
  email: string
  password: string
  fullName: string
}

export type RegisterInvitedAuthUserResult =
  | { ok: true; session: true; userId: string }
  | { ok: true; session: false; userId: string; confirmationSent: true }
  | { ok: false; error: string; alreadyConfirmed?: boolean }

/**
 * Sign up an invited user. When email confirmation is required, Supabase sends the
 * confirmation email on signUp — only resend for existing unconfirmed accounts.
 */
export async function registerInvitedAuthUser(
  input: RegisterInvitedAuthUserInput
): Promise<RegisterInvitedAuthUserResult> {
  const email = input.email.trim().toLowerCase()

  const { data: authData, error: authError } = await input.supabase.auth.signUp({
    email,
    password: input.password,
    options: {
      data: { full_name: input.fullName },
      emailRedirectTo: getSignupEmailRedirectTo(),
    },
  })

  const alreadyExists = authError ? isAlreadyRegisteredAuthError(authError.message) : false

  if (authError && !alreadyExists) {
    return { ok: false, error: authError.message }
  }

  let userId = authData?.user?.id ?? null
  const session = authData?.session ?? null

  if (!userId && alreadyExists) {
    const existing = await findAuthUserByEmail(input.admin, email)
    if (!existing) {
      return { ok: false, error: 'Account exists but could not be loaded. Try again.' }
    }

    if (existing.email_confirmed_at) {
      return {
        ok: false,
        error: 'This email is already registered. Sign in at /auth/login.',
        alreadyConfirmed: true,
      }
    }

    userId = existing.id

    const { error: updateError } = await input.admin.auth.admin.updateUserById(userId, {
      password: input.password,
      user_metadata: { full_name: input.fullName },
    })

    if (updateError) {
      return { ok: false, error: updateError.message }
    }
  }

  if (!userId) {
    return { ok: false, error: authError?.message ?? 'Signup failed' }
  }

  if (session) {
    return { ok: true, session: true, userId }
  }

  // signUp already triggers the confirmation email for new accounts.
  if (!alreadyExists) {
    return { ok: true, session: false, userId, confirmationSent: true }
  }

  const confirmError = await sendSignupConfirmationEmail(input.supabase, email)
  if (confirmError) {
    if (isAuthEmailRateLimitError(confirmError)) {
      return { ok: true, session: false, userId, confirmationSent: true }
    }
    return {
      ok: false,
      error: `Account created but confirmation email failed: ${confirmError}`,
    }
  }

  return { ok: true, session: false, userId, confirmationSent: true }
}
