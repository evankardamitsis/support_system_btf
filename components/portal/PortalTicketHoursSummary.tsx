import { formatHoursShort } from '@/lib/tickets/display'

type PortalTicketHoursSummaryProps = {
  variant: 'hero' | 'aside'
  closed: boolean
  estimatedHours: number | null
  actualHours: number | null
  approvedExtraMinutes: number
  hoursOverageNote?: string | null
}

function getDiscrepancy(
  estimatedHours: number,
  actualHours: number
): { tone: 'over' | 'under'; label: string } | null {
  const delta = Math.round((actualHours - estimatedHours) * 100) / 100
  if (Math.abs(delta) <= 0.01) return null
  if (delta > 0) {
    return { tone: 'over', label: `${formatHoursShort(delta)} over estimate` }
  }
  return { tone: 'under', label: `${formatHoursShort(Math.abs(delta))} under estimate` }
}

function HoursOverageNote({
  note,
  layout,
}: {
  note: string
  layout: 'hero' | 'aside'
}) {
  if (layout === 'hero') {
    return (
      <div className="portal-ticket-hours-overage-note">
        <span className="portal-ticket-hours-overage-label">Why more time was needed</span>
        <p className="portal-ticket-hours-overage-body">{note}</p>
      </div>
    )
  }

  return (
    <div className="portal-ticket-hours-aside-overage">
      <span className="portal-ticket-hours-aside-overage-label">Why more time was needed</span>
      <p className="portal-ticket-hours-aside-overage-body">{note}</p>
    </div>
  )
}

function SecondaryHoursInfo({
  estimatedHours,
  actualHours,
  approvedExtraMinutes,
  hoursOverageNote,
  layout,
}: {
  estimatedHours: number | null
  actualHours: number | null
  approvedExtraMinutes: number
  hoursOverageNote?: string | null
  layout: 'hero' | 'aside'
}) {
  const hasEstimate = estimatedHours != null && estimatedHours > 0
  const hasLogged = actualHours != null && actualHours > 0
  const extraHours = approvedExtraMinutes > 0 ? approvedExtraMinutes / 60 : 0
  const discrepancy =
    hasEstimate && hasLogged ? getDiscrepancy(estimatedHours, actualHours) : null

  const showOverageNote =
    discrepancy?.tone === 'over' && hoursOverageNote != null && hoursOverageNote.trim() !== ''

  if (!hasEstimate && extraHours <= 0 && !showOverageNote) return null

  if (layout === 'hero') {
    return (
      <div className="portal-ticket-hours-secondary">
        {hasEstimate ? (
          <p className="portal-ticket-hours-est">
            <span className="portal-ticket-hours-est-label">Est</span>
            <span className="tabular-nums">{formatHoursShort(estimatedHours)}</span>
          </p>
        ) : null}
        {discrepancy ? (
          <p className="portal-ticket-hours-discrepancy" data-tone={discrepancy.tone}>
            {discrepancy.label}
          </p>
        ) : null}
        {extraHours > 0 ? (
          <p className="portal-ticket-hours-extra">
            <span className="portal-ticket-hours-est-label">Extra</span>
            <span className="tabular-nums">{formatHoursShort(extraHours)}</span>
          </p>
        ) : null}
        {showOverageNote ? <HoursOverageNote note={hoursOverageNote!} layout="hero" /> : null}
      </div>
    )
  }

  return (
    <>
    <dl className="portal-ticket-hours-aside-breakdown">
      {hasEstimate ? (
        <div className="portal-ticket-hours-aside-row">
          <dt>Est</dt>
          <dd className="tabular-nums">{formatHoursShort(estimatedHours)}</dd>
        </div>
      ) : null}
      {discrepancy ? (
        <div className="portal-ticket-hours-aside-row portal-ticket-hours-aside-row--discrepancy">
          <dt>Difference</dt>
          <dd className="tabular-nums" data-tone={discrepancy.tone}>
            {discrepancy.label}
          </dd>
        </div>
      ) : null}
      {extraHours > 0 ? (
        <div className="portal-ticket-hours-aside-row">
          <dt>Extra</dt>
          <dd className="tabular-nums">{formatHoursShort(extraHours)}</dd>
        </div>
      ) : null}
    </dl>
    {showOverageNote ? <HoursOverageNote note={hoursOverageNote!} layout="aside" /> : null}
    </>
  )
}

export function PortalTicketHoursSummary({
  variant,
  closed,
  estimatedHours,
  actualHours,
  approvedExtraMinutes,
  hoursOverageNote = null,
}: PortalTicketHoursSummaryProps) {
  const hasLogged = actualHours != null && actualHours > 0
  const hasEstimate = estimatedHours != null && estimatedHours > 0

  if (closed && hasLogged) {
    if (variant === 'hero') {
      return (
        <section className="portal-ticket-hours-hero" aria-label="Time on this ticket">
          <span className="portal-ticket-hours-hero-eyebrow">Time on this ticket</span>
          <p className="portal-ticket-hours-hero-value tabular-nums">
            {formatHoursShort(actualHours)}
          </p>
          <p className="portal-ticket-hours-hero-label">Logged</p>
          <SecondaryHoursInfo
            estimatedHours={estimatedHours}
            actualHours={actualHours}
            approvedExtraMinutes={approvedExtraMinutes}
            hoursOverageNote={hoursOverageNote}
            layout="hero"
          />
        </section>
      )
    }

    return (
      <section className="portal-ticket-hours-aside" aria-label="Time on this ticket">
        <span className="portal-ticket-hours-aside-eyebrow">Logged</span>
        <p className="portal-ticket-hours-aside-value tabular-nums">
          {formatHoursShort(actualHours)}
        </p>
        <SecondaryHoursInfo
          estimatedHours={estimatedHours}
          actualHours={actualHours}
          approvedExtraMinutes={approvedExtraMinutes}
          hoursOverageNote={hoursOverageNote}
          layout="aside"
        />
      </section>
    )
  }

  if (hasEstimate) {
    if (variant === 'hero') {
      return (
        <section
          className="portal-ticket-hours-hero portal-ticket-hours-hero--estimate-only"
          aria-label="Time on this ticket"
        >
          <span className="portal-ticket-hours-hero-eyebrow">Time on this ticket</span>
          <p className="portal-ticket-hours-hero-value portal-ticket-hours-hero-value--est tabular-nums">
            {formatHoursShort(estimatedHours)}
          </p>
          <p className="portal-ticket-hours-hero-label">Est</p>
          {!closed ? (
            <p className="portal-ticket-hours-hero-hint dash-meta">
              Logged hours will appear here once the ticket is resolved.
            </p>
          ) : null}
        </section>
      )
    }

    return (
      <section className="portal-ticket-hours-aside portal-ticket-hours-aside--estimate">
        <span className="portal-ticket-hours-aside-eyebrow">Est</span>
        <p className="portal-ticket-hours-aside-value tabular-nums">
          {formatHoursShort(estimatedHours)}
        </p>
        {!closed ? (
          <p className="portal-ticket-hours-aside-hint dash-meta">
            Logged hours appear here once the ticket is resolved.
          </p>
        ) : null}
      </section>
    )
  }

  return null
}
