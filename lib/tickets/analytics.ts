export type TicketAnalyticsRow = {
  status: string
  created_at: string
  resolved_at: string | null
  actual_hours: number | null
}

export type TicketAnalytics = {
  openCount: number
  resolvedThisWeek: number
  resolvedThisMonth: number
  avgTurnaroundLabel: string
  totalResolvedHours: number
}

function startOfWeek(d = new Date()): Date {
  const date = new Date(d)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + diff)
  return date
}

function startOfMonth(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function isResolved(status: string): boolean {
  return status === 'resolved' || status === 'closed'
}

export function formatTurnaroundDuration(ms: number): string {
  if (ms < 0) return '—'
  const hours = Math.floor(ms / 3600000)
  if (hours < 1) return 'under 1h'
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  const remHours = hours % 24
  if (remHours === 0) return `${days}d`
  return `${days}d ${remHours}h`
}

export function computeTicketAnalytics(tickets: TicketAnalyticsRow[]): TicketAnalytics {
  const now = Date.now()
  const weekStart = startOfWeek().getTime()
  const monthStart = startOfMonth().getTime()

  let resolvedThisWeek = 0
  let resolvedThisMonth = 0
  let totalResolvedHours = 0
  let openCount = 0
  const turnaroundMs: number[] = []

  for (const t of tickets) {
    if (!isResolved(t.status)) {
      openCount++
      continue
    }

    const hours = t.actual_hours != null ? Number(t.actual_hours) : 0
    if (hours > 0) totalResolvedHours += hours

    if (!t.resolved_at) continue

    const resolvedMs = new Date(t.resolved_at).getTime()
    if (resolvedMs >= weekStart && resolvedMs <= now) resolvedThisWeek++
    if (resolvedMs >= monthStart && resolvedMs <= now) resolvedThisMonth++

    const createdMs = new Date(t.created_at).getTime()
    if (resolvedMs >= createdMs) turnaroundMs.push(resolvedMs - createdMs)
  }

  const avgTurnaroundLabel =
    turnaroundMs.length === 0
      ? '—'
      : formatTurnaroundDuration(
          turnaroundMs.reduce((sum, v) => sum + v, 0) / turnaroundMs.length
        )

  return {
    openCount,
    resolvedThisWeek,
    resolvedThisMonth,
    avgTurnaroundLabel,
    totalResolvedHours: Math.round(totalResolvedHours * 10) / 10,
  }
}
