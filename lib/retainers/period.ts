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
