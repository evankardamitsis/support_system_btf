import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { clientUsesHourBilling } from '@/lib/retainers/billing-model'

type Db = SupabaseClient<Database>

export function ticketUsesHourBilling(
  clientHourBilling: boolean,
  noHours: boolean | null | undefined
): boolean {
  return clientHourBilling && !noHours
}

export async function loadTicketHourBilling(
  supabase: Db,
  clientId: string,
  noHours: boolean | null | undefined
): Promise<boolean> {
  const clientHourBilling = await clientUsesHourBilling(supabase, clientId)
  return ticketUsesHourBilling(clientHourBilling, noHours)
}
