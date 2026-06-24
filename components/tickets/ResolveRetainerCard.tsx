'use client'

export type RetainerOption = {
  id?: string
  period_start: string
  period_end: string
  hours_total: number
  hours_used: number
  package_name?: string | null
}

function formatPeriodShort(start: string, end: string): string {
  const s = new Date(start + 'T00:00:00')
  const e = new Date(end + 'T00:00:00')
  const month = (d: Date) => d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
  return `${month(s)} – ${month(e)}`
}

export function ResolveRetainerCard({
  retainer,
  actualHours,
}: {
  retainer: RetainerOption
  actualHours: string
}) {
  const used = Number(retainer.hours_used)
  const total = Number(retainer.hours_total)
  const remaining = total - used
  const parsed = parseFloat(actualHours)
  const hasEntry = !Number.isNaN(parsed) && parsed > 0
  const afterResolve = hasEntry ? used + parsed : used
  const afterRemaining = total - afterResolve
  const wouldExceed = hasEntry && afterResolve > total
  const overBy = hasEntry ? afterResolve - total : 0

  const basePct = total > 0 ? Math.min(100, (used / total) * 100) : 0
  const afterPct = total > 0 ? Math.min(100, (afterResolve / total) * 100) : 0

  const barLevel =
    afterPct >= 100 ? 'over' : afterPct >= 85 ? 'danger' : basePct >= 85 ? 'danger' : 'ok'

  return (
    <div className="resolve-retainer-card">
      <div className="resolve-retainer-head">
        <span className="resolve-retainer-period">
          {formatPeriodShort(retainer.period_start, retainer.period_end)}
        </span>
        <span className={`resolve-retainer-remaining resolve-retainer-remaining--${remaining <= 0 ? 'over' : remaining < 3 ? 'warn' : 'ok'}`}>
          {remaining > 0 ? `${remaining.toFixed(1)}h left` : `${Math.abs(remaining).toFixed(1)}h over cap`}
        </span>
      </div>

      <div className="resolve-retainer-bar-wrap">
        <div className="resolve-retainer-bar">
          <div
            className={`resolve-retainer-bar-fill resolve-retainer-bar-fill--base resolve-retainer-bar-fill--${barLevel}`}
            style={{ width: `${hasEntry ? afterPct : basePct}%` }}
          />
          {!hasEntry && (
            <div
              className="resolve-retainer-bar-fill resolve-retainer-bar-fill--used"
              style={{ width: `${basePct}%` }}
            />
          )}
        </div>
        <span className="resolve-retainer-bar-label">
          {hasEntry ? afterResolve.toFixed(1) : used.toFixed(1)}h / {total}h
        </span>
      </div>

      {hasEntry && (
        <p className={`resolve-retainer-note ${wouldExceed ? 'resolve-retainer-note--over' : ''}`}>
          {wouldExceed
            ? `This ticket will exceed the retainer by ${overBy.toFixed(1)}h — consider deferring to the next period.`
            : `After resolving: ${afterRemaining.toFixed(1)}h remaining in this period.`}
        </p>
      )}
    </div>
  )
}
