import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { notifyAdminsClientRegistered } from '@/lib/auth/notify-admins-client-registered'

export type FinalizeClientInviteResult =
  | { consumed: false }
  | { consumed: true; clientId: string }

/** Mark the client invite consumed once the user has a confirmed session. */
export async function finalizeClientInvite(
  supabase: SupabaseClient<Database>
): Promise<FinalizeClientInviteResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { consumed: false }

  const { data: profile } = await supabase
    .from('users')
    .select('role, client_id, full_name')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'client' || !profile.client_id) return { consumed: false }

  const { data: pendingInvite } = await supabase
    .from('invite_tokens')
    .select('id')
    .eq('client_id', profile.client_id)
    .eq('used', false)
    .limit(1)

  if (!pendingInvite?.length) return { consumed: false }

  const { error } = await supabase
    .from('invite_tokens')
    .update({ used: true })
    .eq('client_id', profile.client_id)
    .eq('used', false)

  if (error) return { consumed: false }

  const { data: client } = await supabase
    .from('clients')
    .select('name')
    .eq('id', profile.client_id)
    .single()

  const registrantName =
    profile.full_name?.trim() || user.user_metadata?.full_name?.trim() || user.email || 'Client'

  await notifyAdminsClientRegistered({
    userId: user.id,
    clientId: profile.client_id,
    registrantName,
    clientName: client?.name?.trim() || 'Client',
    kind: 'primary',
  })

  return { consumed: true, clientId: profile.client_id }
}
