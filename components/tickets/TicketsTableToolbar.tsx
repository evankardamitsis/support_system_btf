import Link from 'next/link'
import { ticketsListHref } from '@/lib/tickets/query'
import { TicketsClientFilter, type ClientOption } from './TicketsClientFilter'
import { TicketsPriorityFilter } from './TicketsPriorityFilter'
import { TicketsAssigneeFilter } from './TicketsAssigneeFilter'
import type { AssigneeOption } from './EditableAssigneeSelect'

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
  assigned,
  clients = [],
  staff = [],
  mineCount,
  totalShown,
  totalLabel = 'tickets',
  showPriorityFilter = false,
  showClientFilter = false,
  showAssigneeFilter = false,
}: {
  basePath: string
  tabs: TicketTab[]
  activeStatus: string
  priority?: string
  client?: string
  assigned?: string
  clients?: ClientOption[]
  staff?: AssigneeOption[]
  mineCount?: number
  totalShown: number
  totalLabel?: string
  showPriorityFilter?: boolean
  showClientFilter?: boolean
  showAssigneeFilter?: boolean
}) {
  const listFilters = {
    status: activeStatus || undefined,
    priority: priority || undefined,
    client: client || undefined,
    assigned: assigned || undefined,
  }
  const mineActive = assigned === 'me'
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
        {showAssigneeFilter ? (
          <Link
            href={ticketsListHref(basePath, {
              ...listFilters,
              assigned: mineActive ? undefined : 'me',
            })}
            className={`dash-tab ${mineActive ? 'is-active' : ''}`}
          >
            Mine
            {mineCount !== undefined && mineCount > 0 ? (
              <span className="dash-tab-badge">{mineCount}</span>
            ) : null}
          </Link>
        ) : null}
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
            assigned={assigned || undefined}
          />
        ) : null}
        {showPriorityFilter ? (
          <TicketsPriorityFilter
            value={priority ?? ''}
            status={activeStatus || undefined}
            client={client || undefined}
            assigned={assigned || undefined}
          />
        ) : null}
        {showAssigneeFilter && staff.length > 0 ? (
          <TicketsAssigneeFilter
            value={assigned ?? ''}
            status={activeStatus || undefined}
            priority={priority || undefined}
            client={client || undefined}
            staff={staff}
          />
        ) : null}
      </div>
    </div>
  )
}
