import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

function normalizeInviteEmail(email: string): string {
  return email.trim().toLowerCase()
}

/** Remove open team invites for an email on a client (re-invite or signup complete). */
export async function clearPendingClientTeamInvites(
  admin: SupabaseClient<Database>,
  clientId: string,
  email: string
): Promise<void> {
  const normalized = normalizeInviteEmail(email)
  const { error } = await admin
    .from('client_invite_tokens')
    .delete()
    .eq('client_id', clientId)
    .eq('email', normalized)
    .eq('used', false)

  if (error) {
    throw new Error(error.message)
  }
}

/** Drop pending invites for emails that already have portal access on this client. */
export async function clearPendingInvitesForRegisteredMembers(
  admin: SupabaseClient<Database>,
  clientId: string,
  memberEmails: string[]
): Promise<void> {
  const normalized = [
    ...new Set(
      memberEmails
        .map(normalizeInviteEmail)
        .filter(email => email.includes('@'))
    ),
  ]
  if (normalized.length === 0) return

  const { error } = await admin
    .from('client_invite_tokens')
    .delete()
    .eq('client_id', clientId)
    .eq('used', false)
    .in('email', normalized)

  if (error) {
    throw new Error(error.message)
  }
}
