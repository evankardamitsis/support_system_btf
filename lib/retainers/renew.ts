import { tryCreateAdminClient } from '@/lib/supabase/admin'
import { insertRetainerPeriod } from '@/lib/retainers/insert-period'
import {
  billingPeriodContainingDate,
  renewalDateFromPeriodEnd,
} from '@/lib/retainers/period'
import type { RetainerPackage } from '@/lib/retainers/packages'

export type AutoRenewResult = {
  renewed: number
  skipped: number
  errors: string[]
  renewedClientIds: string[]
}

type LatestRetainer = {
  id: string
  client_id: string
  package_name: string
  period_start: string
  period_end: string
  hours_total: number
  period_cost: number
}

export async function processAutoRenewals(): Promise<AutoRenewResult> {
  const adminResult = tryCreateAdminClient()
  if ('error' in adminResult) {
    return { renewed: 0, skipped: 0, errors: [adminResult.error], renewedClientIds: [] }
  }

  const supabase = adminResult.client
  const today = new Date().toISOString().slice(0, 10)
  const result: AutoRenewResult = {
    renewed: 0,
    skipped: 0,
    errors: [],
    renewedClientIds: [],
  }

  const { data: clients, error: clientsError } = await supabase
    .from('clients')
    .select('id, billing_cycle_day, retainer_status')
    .eq('retainer_status', 'active')

  if (clientsError) {
    result.errors.push(clientsError.message)
    return result
  }

  for (const client of clients ?? []) {
    try {
      const { data: latest, error: latestError } = await supabase
        .from('retainers')
        .select('id, client_id, package_name, period_start, period_end, hours_total, period_cost')
        .eq('client_id', client.id)
        .order('period_end', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (latestError) {
        result.errors.push(`${client.id}: ${latestError.message}`)
        continue
      }

      if (!latest) {
        result.skipped += 1
        continue
      }

      const last = latest as LatestRetainer
      if (last.period_end >= today) {
        result.skipped += 1
        continue
      }

      const nextStart = renewalDateFromPeriodEnd(last.period_end)

      const { data: existingNext } = await supabase
        .from('retainers')
        .select('id')
        .eq('client_id', client.id)
        .gte('period_start', nextStart)
        .limit(1)
        .maybeSingle()

      if (existingNext) {
        result.skipped += 1
        continue
      }

      const { period_start, period_end } = billingPeriodContainingDate(
        client.billing_cycle_day ?? 1,
        nextStart
      )

      const packageName: RetainerPackage = last.package_name === 'grow' ? 'grow' : 'care'

      await insertRetainerPeriod(supabase, {
        clientId: client.id,
        packageName,
        hoursTotal: Number(last.hours_total),
        periodCost: Number(last.period_cost ?? 0),
        periodStart: period_start,
        periodEnd: period_end,
        sendClientEmail: true,
      })

      result.renewed += 1
      result.renewedClientIds.push(client.id)
    } catch (err) {
      result.errors.push(
        `${client.id}: ${err instanceof Error ? err.message : 'Renewal failed'}`
      )
    }
  }

  return result
}
