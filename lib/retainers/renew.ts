import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { tryCreateAdminClient } from '@/lib/supabase/admin'
import { insertRetainerPeriod } from '@/lib/retainers/insert-period'
import {
  billingPeriodContainingDate,
  renewalDateFromPeriodEnd,
} from '@/lib/retainers/period'
import { parseRetainerPackage, type RetainerPackage } from '@/lib/retainers/packages'
import { canAutoRenewRetainer, type RetainerLifecycleStatus } from '@/lib/retainers/status'

export type AutoRenewResult = {
  renewed: number
  skipped: number
  errors: string[]
  renewedClientIds: string[]
}

export type RenewClientResult =
  | { ok: true; renewed: true; periodId: string; periodStart: string; periodEnd: string }
  | { ok: true; renewed: false; reason: string }
  | { ok: false; error: string }

type Db = SupabaseClient<Database>

type LatestRetainer = {
  id: string
  client_id: string
  package_name: string
  period_start: string
  period_end: string
  hours_total: number
  period_cost: number
}

type ClientRenewRow = {
  id: string
  billing_cycle_day: number | null
  retainer_status: string | null
}

async function renewClientRetainerWithAdmin(
  supabase: Db,
  client: ClientRenewRow,
  today: string,
  sendClientEmail: boolean
): Promise<RenewClientResult> {
  if (!canAutoRenewRetainer((client.retainer_status ?? 'active') as RetainerLifecycleStatus)) {
    return {
      ok: true,
      renewed: false,
      reason: 'Retainer is frozen or canceled — resume it before renewing.',
    }
  }

  const { data: latest, error: latestError } = await supabase
    .from('retainers')
    .select('id, client_id, package_name, period_start, period_end, hours_total, period_cost')
    .eq('client_id', client.id)
    .order('period_end', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (latestError) {
    return { ok: false, error: latestError.message }
  }

  if (!latest) {
    return { ok: true, renewed: false, reason: 'No retainer period exists for this client.' }
  }

  const last = latest as LatestRetainer
  if (last.period_end >= today) {
    return {
      ok: true,
      renewed: false,
      reason: 'Current period has not ended yet.',
    }
  }

  const nextStart = renewalDateFromPeriodEnd(last.period_end)

  const { data: existingNext } = await supabase
    .from('retainers')
    .select('id, period_start, period_end')
    .eq('client_id', client.id)
    .gte('period_start', nextStart)
    .order('period_start', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (existingNext) {
    return {
      ok: true,
      renewed: false,
      reason: `Next period already exists (${existingNext.period_start} – ${existingNext.period_end}).`,
    }
  }

  const { period_start, period_end } = billingPeriodContainingDate(
    client.billing_cycle_day ?? 1,
    nextStart
  )

  const packageName: RetainerPackage = parseRetainerPackage(last.package_name)

  const { id } = await insertRetainerPeriod(supabase, {
    clientId: client.id,
    packageName,
    hoursTotal: packageName === 'fixed' ? 0 : Number(last.hours_total),
    periodCost: Number(last.period_cost ?? 0),
    periodStart: period_start,
    periodEnd: period_end,
    sendClientEmail,
  })

  return {
    ok: true,
    renewed: true,
    periodId: id,
    periodStart: period_start,
    periodEnd: period_end,
  }
}

/** Renew one client if their latest period has ended. Used by cron and admin "Renew now". */
export async function renewClientRetainerIfDue(
  clientId: string,
  options?: { sendClientEmail?: boolean }
): Promise<RenewClientResult> {
  const adminResult = tryCreateAdminClient()
  if ('error' in adminResult) {
    return { ok: false, error: adminResult.error }
  }

  const supabase = adminResult.client
  const today = new Date().toISOString().slice(0, 10)

  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('id, billing_cycle_day, retainer_status')
    .eq('id', clientId)
    .single()

  if (clientError || !client) {
    return { ok: false, error: clientError?.message ?? 'Client not found' }
  }

  return renewClientRetainerWithAdmin(
    supabase,
    client as ClientRenewRow,
    today,
    options?.sendClientEmail !== false
  )
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
      const outcome = await renewClientRetainerWithAdmin(
        supabase,
        client as ClientRenewRow,
        today,
        true
      )

      if (!outcome.ok) {
        result.errors.push(`${client.id}: ${outcome.error}`)
        continue
      }

      if (outcome.renewed) {
        result.renewed += 1
        result.renewedClientIds.push(client.id)
      } else {
        result.skipped += 1
      }
    } catch (err) {
      result.errors.push(
        `${client.id}: ${err instanceof Error ? err.message : 'Renewal failed'}`
      )
    }
  }

  return result
}
