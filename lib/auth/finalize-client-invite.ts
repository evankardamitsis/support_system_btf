import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

/** Mark the client invite consumed once the user has a confirmed session. */
export async function finalizeClientInvite(
  supabase: SupabaseClient<Database>
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const { data: profile } = await supabase
    .from('users')
    .select('role, client_id')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'client' || !profile.client_id) return

  await supabase
    .from('invite_tokens')
    .update({ used: true })
    .eq('client_id', profile.client_id)
    .eq('used', false)
}
