import Link from 'next/link'
import { UsageBar } from '@/components/dashboard/UsageBar'
import { formatDateRange } from '@/lib/dates'
import { StatusFlag } from '@/components/dashboard/StatusFlag'
import { PackageChip } from '@/components/retainers/PackageChip'
import { formatPeriodCost } from '@/lib/retainers/packages'
import { retainerTracksHours } from '@/lib/retainers/billing-model'

export type RetainerListItem = {
  id: string
  client_id: string
  clientName: string | null
  package_name: string
  period_start: string
  period_end: string
  hours_total: number
  hours_used: number
  period_cost: number
  isActive: boolean
}

function retainerTone(pct: number, isOver: boolean): 'ok' | 'warn' | 'danger' | 'over' {
  if (isOver) return 'over'
  if (pct > 95) return 'danger'
  if (pct > 85) return 'warn'
  return 'ok'
}

export function RetainersList({ retainers }: { retainers: RetainerListItem[] }) {
  if (retainers.length === 0) {
    return (
      <div className="retainers-table dash-empty">
        <p className="dash-empty-title">No retainers yet</p>
        <p className="dash-empty-hint">
          Use the form above to create a retainer period for a client.
        </p>
      </div>
    )
  }

  return (
    <div className="retainers-table">
      <div className="retainers-col-grid retainers-grid-head">
        <span>Client</span>
        <span>Package</span>
        <span>Period</span>
        <span>Hours</span>
        <span>Cost</span>
        <span>Remaining</span>
        <span>Usage</span>
        <span />
      </div>

      <div className="retainers-table-body anim-stagger-2">
        {retainers.map(r => {
          const hoursBilling = retainerTracksHours(r)
          const used = Number(r.hours_used)
          const total = Number(r.hours_total)
          const remaining = total - used
          const pct = total > 0 ? Math.min(100, (used / total) * 100) : 0
          const isOver = hoursBilling && remaining < 0
          const isDanger = hoursBilling && pct > 85
          const tone = hoursBilling ? retainerTone(pct, isOver) : 'ok'

          return (
            <Link
              key={r.id}
              href={`/admin/clients/${r.client_id}`}
              className="retainers-col-grid retainers-row anim-fade-up"
              data-tone={tone}
            >
              <div className="retainers-cell retainers-cell-client min-w-0">
                <p className="retainers-client-name">{r.clientName ?? 'Unknown client'}</p>
                <p className="retainers-client-meta tabular-nums">
                  {formatDateRange(r.period_start, r.period_end)}
                </p>
                {isDanger ? (
                  <StatusFlag
                    label={isOver ? 'Over capacity' : `${Math.round(pct)}% used`}
                    tone={isOver ? 'danger' : 'warn'}
                  />
                ) : r.isActive ? (
                  <span className="retainers-active-badge">Active</span>
                ) : null}
              </div>

              <div className="retainers-cell" data-label="Package">
                <PackageChip packageName={r.package_name} />
              </div>

              <div className="retainers-cell" data-label="Period">
                <p className="retainers-period tabular-nums">
                  {formatDateRange(r.period_start, r.period_end)}
                </p>
              </div>

              <div className="retainers-cell retainers-hours" data-label="Hours">
                {hoursBilling ? (
                  <div className="retainers-hours-value">
                    <span className="tabular-nums">{used.toFixed(1)}</span>
                    <span className="retainers-hours-sep">/</span>
                    <span className="tabular-nums">{total.toFixed(0)}h</span>
                  </div>
                ) : (
                  <span className="dash-meta">Unlimited</span>
                )}
              </div>

              <div
                className="retainers-cell retainers-cell-cost tabular-nums"
                data-label="Cost"
              >
                {formatPeriodCost(r.period_cost)}
              </div>

              <div className="retainers-cell" data-label="Remaining">
                {hoursBilling ? (
                  <span className="retainers-remaining tabular-nums" data-tone={tone}>
                    {isOver ? '−' : ''}
                    {Math.abs(remaining).toFixed(1)}h
                  </span>
                ) : (
                  <span className="dash-meta">—</span>
                )}
              </div>

              <div className="retainers-cell retainers-cell-usage" data-label="Usage">
                {hoursBilling ? (
                  <div className="retainers-usage-value">
                    <UsageBar percent={pct} tone={tone} />
                    <span className="retainers-pct tabular-nums">{Math.round(pct)}%</span>
                  </div>
                ) : (
                  <span className="dash-meta">—</span>
                )}
              </div>

              <div className="retainers-cell retainers-cell-arrow" aria-hidden>
                <span className="entity-card-arrow">→</span>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
