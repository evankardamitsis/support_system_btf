import Link from 'next/link'
import { ticketsListHref } from '@/lib/tickets/query'
import { TicketsClientFilter, type ClientOption } from './TicketsClientFilter'
import { TicketsPriorityFilter } from './TicketsPriorityFilter'

export type TicketTab = {
  label: string
  value: string
  count?: number
}

export function TicketsTableToolbar({
  basePath,
  tabs,
  activeStatus,
  priority,
  client,
  clients = [],
  totalShown,
  totalLabel = 'tickets',
  showPriorityFilter = false,
  showClientFilter = false,
}: {
  basePath: string
  tabs: TicketTab[]
  activeStatus: string
  priority?: string
  client?: string
  clients?: ClientOption[]
  totalShown: number
  totalLabel?: string
  showPriorityFilter?: boolean
  showClientFilter?: boolean
}) {
  const listFilters = {
    status: activeStatus || undefined,
    priority: priority || undefined,
    client: client || undefined,
  }
  return (
    <div className="tickets-toolbar">
      <div className="tickets-toolbar-tabs dash-tabs border-b-0">
        {tabs.map(({ label, value, count }) => {
          const active = activeStatus === value
          return (
            <Link
              key={value || 'all'}
              href={ticketsListHref(basePath, { ...listFilters, status: value || undefined })}
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
        {showClientFilter && clients.length > 0 ? (
          <TicketsClientFilter
            value={client ?? ''}
            clients={clients}
            status={activeStatus || undefined}
            priority={priority || undefined}
          />
        ) : null}
        {showPriorityFilter ? (
          <TicketsPriorityFilter
            value={priority ?? ''}
            status={activeStatus || undefined}
            client={client || undefined}
          />
        ) : null}
      </div>
    </div>
  )
}
