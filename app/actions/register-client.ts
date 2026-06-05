'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendSignupConfirmationEmail } from '@/lib/auth/signup-confirmation'

export type ResendClientTeamConfirmationResult =
  | { ok: true }
  | { ok: false; error: string }

export async function resendClientTeamSignupConfirmation(
  token: string
): Promise<ResendClientTeamConfirmationResult> {
  const supabase = await createClient()

  const { data: invite, error: inviteError } = await supabase
    .from('client_invite_tokens')
    .select('email, used, expires_at')
    .eq('token', token)
    .maybeSingle()

  if (inviteError) {
    return { ok: false, error: inviteError.message }
  }

  if (!invite || invite.used || new Date(invite.expires_at) < new Date()) {
    return { ok: false, error: 'Invite link is invalid or expired' }
  }

  const confirmError = await sendSignupConfirmationEmail(supabase, invite.email)
  if (confirmError) {
    return { ok: false, error: confirmError }
  }

  return { ok: true }
}
