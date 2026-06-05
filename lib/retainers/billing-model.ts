import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { getRetainerForClient } from '@/lib/retainers/active'
import type { RetainerPackage } from '@/lib/retainers/packages'

export type RetainerBillingRow = {
  package_name?: string | null
  hours_limited?: boolean | null
}

export function isHoursBasedPackage(pkg: string | null | undefined): boolean {
  return pkg !== 'fixed'
}

export function retainerTracksHours(retainer: RetainerBillingRow | null | undefined): boolean {
  if (!retainer) return true
  if (retainer.hours_limited === false) return false
  if (retainer.package_name === 'fixed') return false
  return true
}

export async function clientUsesHourBilling(
  supabase: SupabaseClient<Database>,
  clientId: string
): Promise<boolean> {
  const retainer = await getRetainerForClient(supabase, clientId, { includePackage: true })
  return retainerTracksHours(retainer)
}

type RetainerPeriodRow = RetainerBillingRow & {
  client_id: string
  period_start: string
  period_end: string
}

/** Map client IDs to whether their active retainer tracks hours (bulk, for ticket lists). */
export function hourBillingByClientFromRetainers(
  retainers: RetainerPeriodRow[],
  clientIds: string[]
): Record<string, boolean> {
  const today = new Date().toISOString().slice(0, 10)
  const result: Record<string, boolean> = {}
  for (const clientId of clientIds) {
    const periods = retainers
      .filter(r => r.client_id === clientId)
      .sort((a, b) => b.period_start.localeCompare(a.period_start))
    const inRange = periods.find(r => r.period_start <= today && r.period_end >= today)
    result[clientId] = retainerTracksHours(inRange ?? periods[0] ?? null)
  }
  return result
}

export function packageLabel(pkg: RetainerPackage): string {
  if (pkg === 'grow') return 'Grow'
  if (pkg === 'fixed') return 'Fixed'
  return 'Care'
}
