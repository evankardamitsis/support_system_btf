import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { notifyClientNewRetainer } from '@/lib/email/ticket-notifications'
import { renewalDateFromPeriodEnd } from '@/lib/retainers/period'
import { isHoursBasedPackage, packageLabel } from '@/lib/retainers/billing-model'
import { applyPendingDeferredHours } from '@/lib/retainers/deferred'
import type { RetainerPackage } from '@/lib/retainers/packages'

type Db = SupabaseClient<Database>

export type InsertRetainerPeriodInput = {
  clientId: string
  packageName: RetainerPackage
  hoursTotal: number
  periodCost: number
  periodStart: string
  periodEnd: string
  sendClientEmail?: boolean
}

export async function insertRetainerPeriod(
  supabase: Db,
  input: InsertRetainerPeriodInput
): Promise<{ id: string }> {
  const label = packageLabel(input.packageName)
  const hoursLimited = isHoursBasedPackage(input.packageName)

  const { data: retainer, error } = await supabase
    .from('retainers')
    .insert({
      client_id: input.clientId,
      package_name: input.packageName,
      period_start: input.periodStart,
      period_end: input.periodEnd,
      hours_total: hoursLimited ? input.hoursTotal : 0,
      hours_limited: hoursLimited,
      period_cost: Math.round(input.periodCost * 100) / 100,
    })
    .select('id')
    .single()

  if (error || !retainer) {
    throw new Error(error?.message ?? 'Failed to create retainer period')
  }

  try {
    await applyPendingDeferredHours(supabase, input.clientId, retainer.id)
  } catch (err) {
    console.error('[retainers] failed to apply deferred hours:', err)
  }

  await supabase
    .from('clients')
    .update({
      plan_name: label,
      renewal_date: renewalDateFromPeriodEnd(input.periodEnd),
    })
    .eq('id', input.clientId)

  if (input.sendClientEmail !== false) {
    const clientNotify = await notifyClientNewRetainer({
      clientId: input.clientId,
      packageName: input.packageName,
      hoursTotal: input.hoursTotal,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
    })
    if (!clientNotify.sent) {
      console.error('[email] client new-retainer notification failed:', clientNotify.error)
    }
  }

  return { id: retainer.id }
}
