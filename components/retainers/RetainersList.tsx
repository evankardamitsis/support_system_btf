import Link from 'next/link'
import { UsageBar } from '@/components/dashboard/UsageBar'
import { StatusFlag } from '@/components/dashboard/StatusFlag'
import { PackageChip } from '@/components/retainers/PackageChip'
import { formatPeriodCost } from '@/lib/retainers/packages'

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
        <p className="dash-empty-hint">Retainers appear when you set hours on a client.</p>
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
          const used = Number(r.hours_used)
          const total = Number(r.hours_total)
          const remaining = total - used
          const pct = total > 0 ? Math.min(100, (used / total) * 100) : 0
          const isOver = remaining < 0
          const isDanger = pct > 85
          const tone = retainerTone(pct, isOver)

          return (
            <Link
              key={r.id}
              href={`/admin/clients/${r.client_id}`}
              className="retainers-col-grid retainers-row anim-fade-up"
              data-tone={tone}
            >
              <div className="retainers-cell retainers-cell-client min-w-0">
                <p className="retainers-client-name">{r.clientName ?? 'Unknown client'}</p>
                {isDanger ? (
                  <StatusFlag
                    label={isOver ? 'Over capacity' : `${Math.round(pct)}% used`}
                    tone={isOver ? 'danger' : 'warn'}
                  />
                ) : r.isActive ? (
                  <span className="retainers-active-badge">Active</span>
                ) : null}
              </div>

              <div className="retainers-cell">
                <PackageChip packageName={r.package_name} />
              </div>

              <div className="retainers-cell">
                <p className="retainers-period tabular-nums">
                  {new Date(r.period_start).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                  })}
                  <span className="retainers-period-sep"> – </span>
                  {new Date(r.period_end).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: '2-digit',
                  })}
                </p>
              </div>

              <div className="retainers-cell retainers-hours">
                <span className="tabular-nums">{used.toFixed(1)}</span>
                <span className="retainers-hours-sep">/</span>
                <span className="tabular-nums">{total.toFixed(0)}h</span>
              </div>

              <div className="retainers-cell retainers-cell-cost tabular-nums">
                {formatPeriodCost(r.period_cost)}
              </div>

              <div className="retainers-cell">
                <span className="retainers-remaining tabular-nums" data-tone={tone}>
                  {isOver ? '−' : ''}
                  {Math.abs(remaining).toFixed(1)}h
                </span>
              </div>

              <div className="retainers-cell retainers-cell-usage">
                <UsageBar percent={pct} tone={tone} />
                <span className="retainers-pct tabular-nums">{Math.round(pct)}%</span>
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
