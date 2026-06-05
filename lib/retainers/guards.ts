import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import {
  canUseRetainerHours,
  retainerStatusMessage,
  type RetainerLifecycleStatus,
} from '@/lib/retainers/status'

type Db = SupabaseClient<Database>

export async function getClientRetainerStatus(
  supabase: Db,
  clientId: string
): Promise<RetainerLifecycleStatus> {
  const { data } = await supabase
    .from('clients')
    .select('retainer_status')
    .eq('id', clientId)
    .maybeSingle()

  return (data?.retainer_status ?? 'active') as RetainerLifecycleStatus
}

export async function assertClientCanUseRetainer(
  supabase: Db,
  clientId: string
): Promise<void> {
  const status = await getClientRetainerStatus(supabase, clientId)
  if (!canUseRetainerHours(status)) {
    throw new Error(retainerStatusMessage(status))
  }
}
