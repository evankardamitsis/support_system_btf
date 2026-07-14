import Link from 'next/link'
import { StatusPill } from '@/components/ui/StatusPill'
import { PriorityBadge } from '@/components/ui/PriorityBadge'
import { ArrowUpRight } from 'lucide-react'
import { AdminTicketRow } from './AdminTicketRow'
import type { AssigneeOption } from './EditableAssigneeSelect'
import {
  formatDateTimeHuman,
  formatResolvedAtTable,
  formatTicketId,
  formatRelativeTime,
  priorityAccent,
  isRecentlyUpdated,
} from '@/lib/tickets/display'
import type { TicketStatus, TicketPriority } from '@/lib/types'

import type { RetainerTableDetail } from '@/lib/retainers/ticket-table-detail'

export type RetainerDetail = RetainerTableDetail

export type TicketTableRow = {
  id: string
  title: string
  status: TicketStatus
  priority: TicketPriority
  type: string
  updated_at: string
  resolved_at?: string | null
  clientName?: string | null
  clientId?: string | null
  estimated_hours?: number | null
  actual_hours?: number | null
  estimate_status?: 'pending_approval' | 'approved' | null
  completion_status?: 'pending_approval' | 'approved' | null
  hoursBilling?: boolean
  assignedTo?: string | null
  assigneeName?: string | null
  retainerDetail?: RetainerDetail | null
}

export function TicketsTable({
  tickets,
  hrefPrefix,
  variant = 'admin',
  hoursLoggedByTicketId = {},
  emptyTitle = 'No tickets found',
  emptyHint = 'Try another filter or create a new ticket',
  staff = [],
}: {
  tickets: TicketTableRow[]
  hrefPrefix: string
  variant?: 'admin' | 'portal'
  hoursLoggedByTicketId?: Record<string, boolean>
  emptyTitle?: string
  emptyHint?: string
  staff?: AssigneeOption[]
}) {
  const gridClass =
    variant === 'admin' ? 'tickets-grid tickets-grid--admin' : 'tickets-grid tickets-grid--portal'

  if (tickets.length === 0) {
    return (
      <div className="tickets-table">
        <div className={`${gridClass} tickets-table-header`}>
          <HeaderCells variant={variant} />
        </div>
        <div className="dash-empty tickets-table-empty">
          <p className="dash-empty-title">{emptyTitle}</p>
          <p className="dash-empty-hint">{emptyHint}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="tickets-table">
      <div className={`${gridClass} tickets-table-header`}>
        <HeaderCells variant={variant} />
      </div>

      <div className="tickets-table-body">
        {tickets.map(t => {
          if (variant === 'admin') {
            return (
              <AdminTicketRow
                key={t.id}
                ticket={t}
                hrefPrefix={hrefPrefix}
                hoursLogged={hoursLoggedByTicketId[t.id] ?? (t.actual_hours != null && t.actual_hours > 0)}
                hoursBilling={t.hoursBilling ?? true}
                staff={staff}
                retainerDetail={t.retainerDetail ?? null}
              />
            )
          }

          const accent = priorityAccent[t.priority] ?? priorityAccent.normal
          const recent = isRecentlyUpdated(t.updated_at)
          const href = `${hrefPrefix}/${t.id}`
          const needsEstimateApproval = t.estimate_status === 'pending_approval'
          const needsWorkApproval = t.completion_status === 'pending_approval'
          const needsApproval = needsEstimateApproval || needsWorkApproval

          return (
            <Link
              key={t.id}
              href={href}
              className={`${gridClass} tickets-row tickets-row--${t.priority}${needsApproval ? ' tickets-row--needs-approval' : ''}`}
              style={{ ['--row-accent' as string]: accent }}
            >
              <div className="tickets-cell tickets-cell-status" data-label="Status">
                <div className="tickets-cell-value tickets-cell-value--stack">
                  <StatusPill status={t.status} />
                  {needsEstimateApproval ? (
                    <span className="tickets-approve-badge">Approve estimate</span>
                  ) : needsWorkApproval ? (
                    <span className="tickets-approve-badge">Approve work</span>
                  ) : null}
                </div>
              </div>

              <div className="tickets-cell tickets-cell-priority" data-label="Priority">
                <div className="tickets-cell-value">
                  <PriorityBadge priority={t.priority} />
                </div>
              </div>

              <div className="tickets-cell tickets-cell-subject min-w-0">
                <span className="tickets-subject-title">{t.title}</span>
                <span className="tickets-subject-meta">
                  <span className="tickets-subject-id">{formatTicketId(t.id)}</span>
                  <span className="tickets-subject-dot" aria-hidden>
                    ·
                  </span>
                  <span className="capitalize">{t.type}</span>
                </span>
              </div>

              <div className="tickets-cell tickets-cell-updated" data-label="Updated">
                <div className="tickets-cell-value">
                  {t.resolved_at && (t.status === 'resolved' || t.status === 'closed') ? (
                    <time
                      dateTime={t.resolved_at}
                      className="tickets-updated tickets-resolved-at"
                      title={formatDateTimeHuman(t.resolved_at)}
                    >
                      {formatResolvedAtTable(t.resolved_at)}
                    </time>
                  ) : (
                    <time
                      dateTime={t.updated_at}
                      className={recent ? 'tickets-updated-recent' : 'tickets-updated'}
                    >
                      {formatRelativeTime(t.updated_at)}
                    </time>
                  )}
                </div>
              </div>

              <div className="tickets-cell tickets-cell-action" aria-hidden>
                <ArrowUpRight size={15} className="tickets-row-chevron" />
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

function HeaderCells({ variant }: { variant: 'admin' | 'portal' }) {
  return (
    <>
      <span>Status</span>
      <span>Priority</span>
      <span>Subject</span>
      {variant === 'admin' ? (
        <>
          <span>Client</span>
          <span>Assigned</span>
          <span>Est</span>
          <span>Actual</span>
        </>
      ) : null}
      <span>Updated</span>
      <span className="tickets-header-action" aria-hidden />
    </>
  )
}
