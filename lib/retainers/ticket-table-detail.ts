import { getRetainerForClient } from '@/lib/retainers/active'
import { retainerTracksHours } from '@/lib/retainers/billing-model'
import { isActivePeriod } from '@/lib/retainers/packages'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

export type RetainerTableDetail = {
  packageName: string
  periodStart: string
  periodEnd: string
  hoursTotal: number
  hoursUsed: number
  hoursRemaining: number
  committedHours: number
  ticketCount: number
  level: 'ok' | 'warning' | 'critical' | 'over'
  isCurrentPeriod: boolean
}

type RetainerRow = {
  client_id: string
  package_name: string | null
  hours_limited: boolean | null
  period_start: string
  period_end: string
  hours_total: number | null
  hours_used: number | null
}

type TicketRow = {
  client_id: string
  created_at: string
  estimated_hours: number | null
}

function retainerLevel(used: number, total: number): RetainerTableDetail['level'] {
  if (total <= 0) return 'ok'
  const ratio = used / total
  if (ratio >= 1) return 'over'
  if (ratio >= 0.9) return 'critical'
  if (ratio >= 0.7) return 'warning'
  return 'ok'
}

/** Prefer the period containing today; otherwise the latest by period end. */
export function pickRetainerPeriod(periods: RetainerRow[], onDate = new Date()): RetainerRow | null {
  if (!periods.length) return null
  const today = onDate.toISOString().slice(0, 10)
  const active = periods.find(r => r.period_start <= today && r.period_end >= today)
  if (active) return active
  return [...periods].sort((a, b) => b.period_end.localeCompare(a.period_end))[0]
}

export function buildRetainerDetailFromPeriod(
  period: RetainerRow,
  tickets: TicketRow[],
  clientId: string,
  onDate = new Date()
): RetainerTableDetail {
  const periodTickets = tickets.filter(t => {
    if (t.client_id !== clientId) return false
    const day = t.created_at.slice(0, 10)
    return day >= period.period_start && day <= period.period_end
  })

  const committedHours = periodTickets.reduce(
    (sum, t) => sum + (t.estimated_hours != null ? Number(t.estimated_hours) : 0),
    0
  )
  const hoursTotal = Number(period.hours_total)
  const hoursUsed = Number(period.hours_used ?? 0)
  const hoursRemaining = hoursTotal - hoursUsed

  return {
    packageName: period.package_name ?? '',
    periodStart: period.period_start,
    periodEnd: period.period_end,
    hoursTotal,
    hoursUsed,
    hoursRemaining,
    committedHours,
    ticketCount: periodTickets.length,
    level: retainerLevel(hoursUsed, hoursTotal),
    isCurrentPeriod: isActivePeriod(period.period_start, period.period_end, onDate),
  }
}

export function buildRetainerDetailByClientId(
  retainers: RetainerRow[],
  tickets: TicketRow[],
  clientIds: string[]
): Map<string, RetainerTableDetail> {
  const periodsByClient = new Map<string, RetainerRow[]>()

  for (const row of retainers) {
    if (!row.hours_limited || row.hours_total == null) continue
    const list = periodsByClient.get(row.client_id) ?? []
    list.push(row)
    periodsByClient.set(row.client_id, list)
  }

  const result = new Map<string, RetainerTableDetail>()
  const today = new Date()

  for (const clientId of clientIds) {
    const periods = periodsByClient.get(clientId)
    if (!periods?.length) continue

    const period = pickRetainerPeriod(periods, today)
    if (!period) continue

    result.set(clientId, buildRetainerDetailFromPeriod(period, tickets, clientId, today))
  }

  return result
}

type Db = SupabaseClient<Database>

/** Live retainer snapshot for a single client (used when opening the tickets-table modal). */
export async function fetchClientRetainerTableDetail(
  supabase: Db,
  clientId: string
): Promise<RetainerTableDetail | null> {
  const retainer = await getRetainerForClient(supabase, clientId, { includePackage: true })
  if (!retainer || !retainerTracksHours(retainer) || retainer.hours_limited === false) {
    return null
  }
  if (retainer.hours_total == null) return null

  const { data: tickets } = await supabase
    .from('tickets')
    .select('client_id, created_at, estimated_hours')
    .eq('client_id', clientId)

  return buildRetainerDetailFromPeriod(
    {
      client_id: clientId,
      package_name: retainer.package_name ?? null,
      hours_limited: retainer.hours_limited ?? true,
      period_start: retainer.period_start,
      period_end: retainer.period_end,
      hours_total: retainer.hours_total,
      hours_used: retainer.hours_used,
    },
    (tickets ?? []).map(t => ({
      client_id: t.client_id,
      created_at: t.created_at,
      estimated_hours: t.estimated_hours != null ? Number(t.estimated_hours) : null,
    })),
    clientId
  )
}
