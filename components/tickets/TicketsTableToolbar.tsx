import Link from 'next/link'
import { TicketsPriorityFilter } from './TicketsPriorityFilter'

export type TicketTab = {
  label: string
  value: string
  count?: number
}

function tabHref(basePath: string, status: string, priority?: string) {
  const params = new URLSearchParams()
  if (status) params.set('status', status)
  if (priority) params.set('priority', priority)
  const q = params.toString()
  return q ? `${basePath}?${q}` : basePath
}

export function TicketsTableToolbar({
  basePath,
  tabs,
  activeStatus,
  priority,
  totalShown,
  totalLabel = 'tickets',
  showPriorityFilter = false,
}: {
  basePath: string
  tabs: TicketTab[]
  activeStatus: string
  priority?: string
  totalShown: number
  totalLabel?: string
  showPriorityFilter?: boolean
}) {
  return (
    <div className="tickets-toolbar">
      <div className="tickets-toolbar-tabs dash-tabs border-b-0">
        {tabs.map(({ label, value, count }) => {
          const active = activeStatus === value
          return (
            <Link
              key={value || 'all'}
              href={tabHref(basePath, value, priority)}
              className={`dash-tab ${active ? 'is-active' : ''}`}
            >
              {label}
              {count !== undefined && count > 0 ? (
                <span className="dash-tab-badge">{count}</span>
              ) : null}
            </Link>
          )
        })}
      </div>

      <div className="tickets-toolbar-actions">
        <p className="tickets-result-count">
          <span className="tickets-result-count-num">{totalShown}</span> {totalLabel}
        </p>
        {showPriorityFilter ? (
          <TicketsPriorityFilter value={priority ?? ''} status={activeStatus || undefined} />
        ) : null}
      </div>
    </div>
  )
}
