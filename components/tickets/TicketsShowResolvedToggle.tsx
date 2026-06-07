'use client'

import { useRouter } from 'next/navigation'
import { ticketsListHref, type TicketListFilters } from '@/lib/tickets/query'

export function TicketsShowResolvedToggle({
  basePath,
  filters,
  showResolved,
  resolvedCount = 0,
}: {
  basePath: string
  filters: TicketListFilters
  showResolved: boolean
  resolvedCount?: number
}) {
  const router = useRouter()
  const label =
    resolvedCount > 0 ? `Show resolved (${resolvedCount})` : 'Show resolved'

  return (
    <label className="ops-project-filter-check tickets-show-resolved-check">
      <input
        type="checkbox"
        className="ops-project-filter-check-input"
        checked={showResolved}
        onChange={event => {
          router.push(
            ticketsListHref(basePath, {
              ...filters,
              showResolved: event.target.checked ? '1' : undefined,
            })
          )
        }}
      />
      <span className="ops-project-filter-check-ui" aria-hidden>
        <span className="ops-project-filter-check-box">
          <span className="ops-project-filter-check-bars">
            <span className="ops-project-filter-check-bar" />
            <span className="ops-project-filter-check-bar" />
            <span className="ops-project-filter-check-bar ops-project-filter-check-bar--done" />
          </span>
          <span className="ops-project-filter-check-mark" />
        </span>
      </span>
      <span className="ops-project-filter-check-label">{label}</span>
    </label>
  )
}
