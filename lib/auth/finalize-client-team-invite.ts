import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { notifyAdminsClientRegistered } from '@/lib/auth/notify-admins-client-registered'
import { clearPendingClientTeamInvites } from '@/lib/client-team/invite-cleanup'
import { tryCreateAdminClient } from '@/lib/supabase/admin'

export type FinalizeClientTeamInviteResult =
  | { consumed: false }
  | { consumed: true; clientId: string }

/** Mark the client team invite consumed once the user has a confirmed session. */
export async function finalizeClientTeamInvite(
  supabase: SupabaseClient<Database>
): Promise<FinalizeClientTeamInviteResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email) return { consumed: false }

  const email = user.email.toLowerCase()

  const { data: profile } = await supabase
    .from('users')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'client') return { consumed: false }

  const { data: pendingInvite } = await supabase
    .from('client_invite_tokens')
    .select('id, client_id, full_name')
    .eq('email', email)
    .eq('used', false)
    .limit(1)
    .maybeSingle()

  if (!pendingInvite) return { consumed: false }

  const adminResult = tryCreateAdminClient()
  if (!('error' in adminResult)) {
    try {
      await clearPendingClientTeamInvites(
        adminResult.client,
        pendingInvite.client_id,
        email
      )
    } catch {
      // Fall back to marking consumed when admin cleanup is unavailable.
      await supabase
        .from('client_invite_tokens')
        .update({ used: true })
        .eq('email', email)
        .eq('used', false)
    }
  } else {
    const { error } = await supabase
      .from('client_invite_tokens')
      .update({ used: true })
      .eq('email', email)
      .eq('used', false)

    if (error) return { consumed: false }
  }

  const { data: client } = await supabase
    .from('clients')
    .select('name')
    .eq('id', pendingInvite.client_id)
    .single()

  const registrantName =
    profile.full_name?.trim() ||
    pendingInvite.full_name?.trim() ||
    user.user_metadata?.full_name?.trim() ||
    user.email ||
    'Team member'

  await notifyAdminsClientRegistered({
    userId: user.id,
    clientId: pendingInvite.client_id,
    registrantName,
    clientName: client?.name?.trim() || 'Client',
    kind: 'team',
  })

  return { consumed: true, clientId: pendingInvite.client_id }
}
