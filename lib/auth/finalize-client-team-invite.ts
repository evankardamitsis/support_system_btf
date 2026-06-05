import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

/** Mark the client team invite consumed once the user has a confirmed session. */
export async function finalizeClientTeamInvite(
  supabase: SupabaseClient<Database>
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email) return

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'client') return

  await supabase
    .from('client_invite_tokens')
    .update({ used: true })
    .eq('email', user.email.toLowerCase())
    .eq('used', false)
}
