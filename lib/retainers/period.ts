/** Current monthly billing window from a cycle day (1–28). */
export function currentBillingPeriod(billingCycleDay = 1): {
  period_start: string
  period_end: string
} {
  const cycleDay = Math.min(28, Math.max(1, billingCycleDay))
  const now = new Date()
  let y = now.getFullYear()
  let m = now.getMonth()

  if (now.getDate() < cycleDay) {
    m -= 1
    if (m < 0) {
      m = 11
      y -= 1
    }
  }

  const start = new Date(y, m, cycleDay)
  const end = new Date(y, m + 1, cycleDay)
  end.setDate(end.getDate() - 1)

  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  return { period_start: fmt(start), period_end: fmt(end) }
}

/** First day of the next billing period (renewal date). */
export function renewalDateFromPeriodEnd(periodEnd: string): string {
  const d = new Date(`${periodEnd}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

/** Billing window that contains a given date (for renewals after period end). */
export function billingPeriodContainingDate(
  billingCycleDay: number,
  dateStr: string
): { period_start: string; period_end: string } {
  const cycleDay = Math.min(28, Math.max(1, billingCycleDay))
  const d = new Date(`${dateStr}T12:00:00Z`)
  let y = d.getUTCFullYear()
  let m = d.getUTCMonth()
  const day = d.getUTCDate()

  if (day < cycleDay) {
    m -= 1
    if (m < 0) {
      m = 11
      y -= 1
    }
  }

  const start = new Date(Date.UTC(y, m, cycleDay))
  const end = new Date(Date.UTC(y, m + 1, cycleDay))
  end.setUTCDate(end.getUTCDate() - 1)

  const fmt = (date: Date) => date.toISOString().slice(0, 10)
  return { period_start: fmt(start), period_end: fmt(end) }
}
