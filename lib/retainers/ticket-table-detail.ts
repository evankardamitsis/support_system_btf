import { isActivePeriod } from '@/lib/retainers/packages'

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

function pickRetainerPeriod(periods: RetainerRow[], onDate = new Date()): RetainerRow | null {
  if (!periods.length) return null
  const sorted = [...periods].sort((a, b) => b.period_start.localeCompare(a.period_start))
  const active = sorted.find(r => isActivePeriod(r.period_start, r.period_end, onDate))
  return active ?? sorted[0]
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

    result.set(clientId, {
      packageName: period.package_name ?? '',
      periodStart: period.period_start,
      periodEnd: period.period_end,
      hoursTotal,
      hoursUsed,
      hoursRemaining,
      committedHours,
      ticketCount: periodTickets.length,
      level: retainerLevel(hoursUsed, hoursTotal),
      isCurrentPeriod: isActivePeriod(period.period_start, period.period_end, today),
    })
  }

  return result
}
