import Link from 'next/link'
import { StatusPill } from '@/components/ui/StatusPill'
import { PriorityBadge } from '@/components/ui/PriorityBadge'
import { ArrowUpRight } from 'lucide-react'
import { AdminTicketRow } from './AdminTicketRow'
import {
  formatDateTimeHuman,
  formatResolvedAtTable,
  formatTicketId,
  formatRelativeTime,
  priorityAccent,
  isRecentlyUpdated,
} from '@/lib/tickets/display'
import type { TicketStatus, TicketPriority } from '@/lib/types'

export type TicketTableRow = {
  id: string
  title: string
  status: TicketStatus
  priority: TicketPriority
  type: string
  updated_at: string
  resolved_at?: string | null
  clientName?: string | null
  estimated_hours?: number | null
  actual_hours?: number | null
  estimate_status?: 'pending_approval' | 'approved' | null
}

export function TicketsTable({
  tickets,
  hrefPrefix,
  variant = 'admin',
  hoursLoggedByTicketId = {},
  emptyTitle = 'No tickets found',
  emptyHint = 'Try another filter or create a new ticket',
}: {
  tickets: TicketTableRow[]
  hrefPrefix: string
  variant?: 'admin' | 'portal'
  hoursLoggedByTicketId?: Record<string, boolean>
  emptyTitle?: string
  emptyHint?: string
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
              />
            )
          }

          const accent = priorityAccent[t.priority] ?? priorityAccent.normal
          const recent = isRecentlyUpdated(t.updated_at)
          const href = `${hrefPrefix}/${t.id}`
          const needsApproval = t.estimate_status === 'pending_approval'

          return (
            <Link
              key={t.id}
              href={href}
              className={`${gridClass} tickets-row tickets-row--${t.priority}${needsApproval ? ' tickets-row--needs-approval' : ''}`}
              style={{ ['--row-accent' as string]: accent }}
            >
              <div className="tickets-cell tickets-cell-status">
                <StatusPill status={t.status} />
                {needsApproval ? (
                  <span className="tickets-approve-badge">Approve estimate</span>
                ) : null}
              </div>

              <div className="tickets-cell tickets-cell-priority">
                <PriorityBadge priority={t.priority} />
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

              <div className="tickets-cell tickets-cell-updated">
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
          <span>Est</span>
          <span>Actual</span>
        </>
      ) : null}
      <span>Updated</span>
      <span className="tickets-header-action" aria-hidden />
    </>
  )
}
