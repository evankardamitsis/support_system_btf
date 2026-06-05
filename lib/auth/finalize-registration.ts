import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { finalizeClientInvite } from '@/lib/auth/finalize-client-invite'
import { finalizeStaffInvite } from '@/lib/auth/finalize-staff-invite'

export async function finalizeRegistration(
  supabase: SupabaseClient<Database>
): Promise<void> {
  await finalizeClientInvite(supabase)
  await finalizeStaffInvite(supabase)
}
