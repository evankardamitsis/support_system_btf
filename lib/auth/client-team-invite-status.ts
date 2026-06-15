import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { findAuthUserByEmail } from '@/lib/team/auth-users'
import { tryCreateAdminClient } from '@/lib/supabase/admin'

export type ClientTeamInviteLanding =
  | { kind: 'register' }
  | { kind: 'check_email'; email: string }
  | {
      kind: 'sign_in'
      email: string
      confirmed: boolean
      reason: 'invite_used' | 'invite_expired'
    }
  | { kind: 'invalid' }

type InviteRow = {
  email: string
  used: boolean
  expires_at: string
}

export async function resolveClientTeamInviteLanding(
  invite: InviteRow | null,
  showCheckEmail: boolean
): Promise<ClientTeamInviteLanding> {
  if (!invite) return { kind: 'invalid' }

  const expired = new Date(invite.expires_at) < new Date()

  if (!expired && !invite.used) {
    return showCheckEmail ? { kind: 'check_email', email: invite.email } : { kind: 'register' }
  }

  if (!expired && invite.used && showCheckEmail) {
    return { kind: 'check_email', email: invite.email }
  }

  const adminResult = tryCreateAdminClient()
  if ('error' in adminResult) {
    return expired || invite.used ? { kind: 'invalid' } : { kind: 'register' }
  }

  const authUser = await findAuthUserByEmail(adminResult.client, invite.email)
  if (!authUser) {
    return { kind: 'invalid' }
  }

  const { data: profile } = await adminResult.client
    .from('users')
    .select('role')
    .eq('id', authUser.id)
    .maybeSingle()

  if (profile?.role === 'client') {
    return {
      kind: 'sign_in',
      email: invite.email,
      confirmed: Boolean(authUser.email_confirmed_at),
      reason: expired ? 'invite_expired' : 'invite_used',
    }
  }

  return { kind: 'invalid' }
}

export async function loadClientTeamInviteByToken(
  supabase: SupabaseClient<Database>,
  token: string
) {
  const { data } = await supabase
    .from('client_invite_tokens')
    .select('id, client_id, email, full_name, used, expires_at')
    .eq('token', token)
    .maybeSingle()

  return data
}
