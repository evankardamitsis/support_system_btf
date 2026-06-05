import { formatHoursShort } from '@/lib/tickets/display'

type PortalTicketHoursSummaryProps = {
  variant: 'hero' | 'aside'
  closed: boolean
  estimatedHours: number | null
  actualHours: number | null
  approvedExtraMinutes: number
}

function HoursMeta({
  estimatedHours,
  actualHours,
  approvedExtraMinutes,
}: {
  estimatedHours: number | null
  actualHours: number | null
  approvedExtraMinutes: number
}) {
  const extraHours = approvedExtraMinutes > 0 ? approvedExtraMinutes / 60 : 0
  const showEstimate =
    estimatedHours != null &&
    estimatedHours > 0 &&
    (actualHours == null || Math.abs(estimatedHours - actualHours) > 0.01)

  if (!showEstimate && extraHours <= 0) return null

  return (
    <p className="portal-ticket-hours-meta">
      {showEstimate ? (
        <span>
          Quoted <span className="tabular-nums">{formatHoursShort(estimatedHours)}</span>
        </span>
      ) : null}
      {showEstimate && extraHours > 0 ? <span aria-hidden> · </span> : null}
      {extraHours > 0 ? (
        <span>
          <span className="tabular-nums">{formatHoursShort(extraHours)}</span> extra
        </span>
      ) : null}
    </p>
  )
}

export function PortalTicketHoursSummary({
  variant,
  closed,
  estimatedHours,
  actualHours,
  approvedExtraMinutes,
}: PortalTicketHoursSummaryProps) {
  const hasLogged = actualHours != null && actualHours > 0
  const hasEstimate = estimatedHours != null && estimatedHours > 0
  const extraHours = approvedExtraMinutes > 0 ? approvedExtraMinutes / 60 : 0

  if (closed && hasLogged) {
    if (variant === 'hero') {
      return (
        <section className="portal-ticket-hours-hero" aria-label="Time billed on this ticket">
          <span className="portal-ticket-hours-hero-eyebrow">Time on this ticket</span>
          <p className="portal-ticket-hours-hero-value tabular-nums">
            {formatHoursShort(actualHours)}
          </p>
          <p className="portal-ticket-hours-hero-label">Logged hours</p>
          <HoursMeta
            estimatedHours={estimatedHours}
            actualHours={actualHours}
            approvedExtraMinutes={approvedExtraMinutes}
          />
        </section>
      )
    }

    return (
      <section className="portal-ticket-hours-aside" aria-label="Time billed on this ticket">
        <span className="portal-ticket-hours-aside-eyebrow">Logged</span>
        <p className="portal-ticket-hours-aside-value tabular-nums">
          {formatHoursShort(actualHours)}
        </p>
        {(hasEstimate || extraHours > 0) && (
          <dl className="portal-ticket-hours-aside-breakdown">
            {hasEstimate ? (
              <div className="portal-ticket-hours-aside-row">
                <dt>Quoted</dt>
                <dd className="tabular-nums">{formatHoursShort(estimatedHours)}</dd>
              </div>
            ) : null}
            {extraHours > 0 ? (
              <div className="portal-ticket-hours-aside-row">
                <dt>Extra</dt>
                <dd className="tabular-nums">{formatHoursShort(extraHours)}</dd>
              </div>
            ) : null}
          </dl>
        )}
      </section>
    )
  }

  if (!closed && hasEstimate) {
    if (variant === 'hero') return null

    return (
      <section className="portal-ticket-hours-aside portal-ticket-hours-aside--estimate">
        <span className="portal-ticket-hours-aside-eyebrow">Estimate</span>
        <p className="portal-ticket-hours-aside-value tabular-nums">
          {formatHoursShort(estimatedHours)}
        </p>
        <p className="portal-ticket-hours-aside-hint dash-meta">
          Final logged hours appear here once the ticket is resolved.
        </p>
      </section>
    )
  }

  return null
}
