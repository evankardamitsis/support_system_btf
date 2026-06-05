import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

/** Mark the staff invite consumed once the user has a confirmed session. */
export async function finalizeStaffInvite(
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

  if (profile?.role !== 'admin' && profile?.role !== 'agent') return

  await supabase
    .from('staff_invite_tokens')
    .update({ used: true })
    .eq('email', user.email.toLowerCase())
    .eq('used', false)
}
