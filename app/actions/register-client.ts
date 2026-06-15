'use server'

import { createClient } from '@/lib/supabase/server'
import { tryCreateAdminClient } from '@/lib/supabase/admin'
import { sendSignupConfirmationEmailViaZepto } from '@/lib/email/signup-confirmation-email'

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

  if (!invite) {
    return { ok: false, error: 'Invite link is invalid or expired' }
  }

  if (new Date(invite.expires_at) < new Date()) {
    return { ok: false, error: 'Invite link is invalid or expired' }
  }

  const adminResult = tryCreateAdminClient()
  if ('error' in adminResult) {
    return { ok: false, error: adminResult.error }
  }

  const emailResult = await sendSignupConfirmationEmailViaZepto(adminResult.client, invite.email)
  if (!emailResult.sent) {
    return { ok: false, error: emailResult.error }
  }

  return { ok: true }
}
