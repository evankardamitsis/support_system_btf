import {
  buildPortalHoursBreakdown,
  type PortalHoursBreakdown,
} from '@/lib/tickets/portal-hours-breakdown'
import type { TicketStatus } from '@/lib/types'

export type PortalTicketHoursInput = {
  closed: boolean
  status: TicketStatus
  estimatedHours: number | null
  actualHours: number | null
  approvedExtraMinutes: number
  pendingExtraMinutes: number
  extraHoursActiveAt: string | null
  estimateStatus: 'pending_approval' | 'approved' | null
  hoursOverageNote?: string | null
}

function HoursBreakdownPanel({ breakdown }: { breakdown: PortalHoursBreakdown }) {
  const isLoggedPrimary = breakdown.headline.label === 'Logged'

  return (
    <section
      className="portal-ticket-hours-panel"
      data-primary={isLoggedPrimary ? 'logged' : 'est'}
      aria-label="Hours breakdown"
    >
      <span className="portal-ticket-hours-panel-eyebrow">Time on this ticket</span>
      <p className="portal-ticket-hours-panel-headline tabular-nums">{breakdown.headline.value}</p>
      <p className="portal-ticket-hours-panel-headline-label">{breakdown.headline.label}</p>

      {breakdown.rows.length > 0 ? (
        <dl className="portal-ticket-hours-breakdown">
          {breakdown.rows.map(row => (
            <div key={row.label} className="portal-ticket-hours-breakdown-row">
              <dt>{row.label}</dt>
              <dd className="tabular-nums" data-tone={row.tone ?? 'default'}>
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      {breakdown.note ? (
        <div className="portal-ticket-hours-note">
          <span className="portal-ticket-hours-note-label">{breakdown.note.label}</span>
          <p className="portal-ticket-hours-note-body">{breakdown.note.body}</p>
        </div>
      ) : null}

      {breakdown.hint ? (
        <p className="portal-ticket-hours-hint dash-meta">{breakdown.hint}</p>
      ) : null}
    </section>
  )
}

export function PortalTicketHoursSummary(props: PortalTicketHoursInput) {
  const breakdown = buildPortalHoursBreakdown({
    ...props,
    hoursOverageNote: props.hoursOverageNote ?? null,
  })

  if (!breakdown) return null

  return <HoursBreakdownPanel breakdown={breakdown} />
}
