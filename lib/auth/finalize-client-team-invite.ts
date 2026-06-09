import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { notifyAdminsClientRegistered } from '@/lib/auth/notify-admins-client-registered'

/** Mark the client team invite consumed once the user has a confirmed session. */
export async function finalizeClientTeamInvite(
  supabase: SupabaseClient<Database>
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email) return

  const email = user.email.toLowerCase()

  const { data: profile } = await supabase
    .from('users')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'client') return

  const { data: pendingInvite } = await supabase
    .from('client_invite_tokens')
    .select('id, client_id, full_name')
    .eq('email', email)
    .eq('used', false)
    .limit(1)
    .maybeSingle()

  if (!pendingInvite) return

  const { error } = await supabase
    .from('client_invite_tokens')
    .update({ used: true })
    .eq('email', email)
    .eq('used', false)

  if (error) return

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
}
