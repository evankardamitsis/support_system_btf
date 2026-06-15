import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { findAuthUserByEmail } from '@/lib/team/auth-users'

export type RegisterInvitedPortalUserResult =
  | { ok: true; session: true; userId: string }
  | { ok: false; error: string; alreadyConfirmed?: boolean }

/**
 * Create or update an invited portal user with a confirmed email, then sign in.
 * Skips Supabase Auth confirmation emails — the invite link is the verification.
 */
export async function registerInvitedPortalUser(input: {
  supabase: SupabaseClient<Database>
  admin: SupabaseClient<Database>
  email: string
  password: string
  fullName: string
}): Promise<RegisterInvitedPortalUserResult> {
  const email = input.email.trim().toLowerCase()
  const existing = await findAuthUserByEmail(input.admin, email)

  if (existing?.email_confirmed_at) {
    return {
      ok: false,
      error: 'This email is already registered. Sign in at /auth/login.',
      alreadyConfirmed: true,
    }
  }

  let userId: string

  if (existing) {
    const { error } = await input.admin.auth.admin.updateUserById(existing.id, {
      password: input.password,
      email_confirm: true,
      user_metadata: { full_name: input.fullName },
    })
    if (error) {
      return { ok: false, error: error.message }
    }
    userId = existing.id
  } else {
    const { data, error } = await input.admin.auth.admin.createUser({
      email,
      password: input.password,
      email_confirm: true,
      user_metadata: { full_name: input.fullName },
    })
    if (error || !data.user) {
      return { ok: false, error: error?.message ?? 'Signup failed' }
    }
    userId = data.user.id
  }

  const { error: signInError } = await input.supabase.auth.signInWithPassword({
    email,
    password: input.password,
  })

  if (signInError) {
    return {
      ok: false,
      error: `Account created but sign-in failed: ${signInError.message}`,
    }
  }

  return { ok: true, session: true, userId }
}
