import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { finalizeClientInvite } from '@/lib/auth/finalize-client-invite'
import { finalizeClientTeamInvite } from '@/lib/auth/finalize-client-team-invite'
import { finalizeStaffInvite } from '@/lib/auth/finalize-staff-invite'
import { tryCreateAdminClient } from '@/lib/supabase/admin'
import { sendDeferredApprovalNotifications } from '@/lib/tickets/portal-approval'

export async function finalizeRegistration(
  supabase: SupabaseClient<Database>
): Promise<void> {
  const primaryInvite = await finalizeClientInvite(supabase)
  const teamInvite = await finalizeClientTeamInvite(supabase)
  await finalizeStaffInvite(supabase)

  const clientId = primaryInvite.consumed
    ? primaryInvite.clientId
    : teamInvite.consumed
      ? teamInvite.clientId
      : null

  if (!clientId) return

  const adminResult = tryCreateAdminClient()
  if ('error' in adminResult) return

  await sendDeferredApprovalNotifications(adminResult.client, clientId)
}
