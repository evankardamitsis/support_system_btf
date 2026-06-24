'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { ArrowUpRight } from 'lucide-react'
import {
  resolveTicketSimple,
  updateTicketAssignee,
  updateTicketPriority,
  updateTicketStatus,
} from '@/app/actions/tickets'
import {
  formatDateTimeHuman,
  formatResolvedAtTable,
  formatTicketId,
  formatRelativeTime,
  priorityAccent,
  isRecentlyUpdated,
  ticketRowAwaitingApprovalClass,
  ticketRowStatusClass,
} from '@/lib/tickets/display'
import { StatusPill } from '@/components/ui/StatusPill'
import { PriorityBadge } from '@/components/ui/PriorityBadge'
import { EditableAssigneeSelect, type AssigneeOption } from './EditableAssigneeSelect'
import { EditableStatusPill } from './EditableStatusPill'
import { EditablePriorityPill } from './EditablePriorityPill'
import { ResolveHoursModal } from './ResolveHoursModal'
import type { TicketTableRow, RetainerDetail } from './TicketsTable'
import { ClientRetainerPopover } from './ClientRetainerPopover'
import { canEditTicketPriority, isTicketClosed } from '@/lib/tickets/closed'
import { canResolveTicket } from '@/lib/tickets/completion'
import { formatTicketPriority, formatTicketStatus, notifyError, runWithToast } from '@/lib/notify'
import type { TicketPriority, TicketStatus } from '@/lib/types'

export function AdminTicketRow({
  ticket,
  hrefPrefix,
  hoursLogged,
  hoursBilling = true,
  staff = [],
  retainerDetail = null,
}: {
  ticket: TicketTableRow
  hrefPrefix: string
  hoursLogged: boolean
  hoursBilling?: boolean
  staff?: AssigneeOption[]
  retainerDetail?: RetainerDetail | null
}) {
  const router = useRouter()
  const [resolveOpen, setResolveOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const accent = priorityAccent[ticket.priority] ?? priorityAccent.normal
  const recent = isRecentlyUpdated(ticket.updated_at)
  const href = `${hrefPrefix}/${ticket.id}`
  const closed = isTicketClosed(ticket.status)
  const priorityEditable = canEditTicketPriority(ticket.status)
  const statusRowClass =
    ticketRowStatusClass(ticket.status) +
    ticketRowAwaitingApprovalClass(ticket.estimate_status, ticket.completion_status)

  function refresh() {
    router.refresh()
  }

  function onPriorityChange(priority: TicketPriority) {
    if (!priorityEditable) return
    startTransition(async () => {
      const ok = await runWithToast(() => updateTicketPriority(ticket.id, priority), {
        success: `Priority set to ${formatTicketPriority(priority)}`,
      })
      if (ok !== null) refresh()
    })
  }

  function onAssigneeChange(assigneeId: string | null) {
    startTransition(async () => {
      const ok = await runWithToast(() => updateTicketAssignee(ticket.id, assigneeId), {
        loading: 'Updating assignee…',
        success: assigneeId
          ? `Assigned to ${staff.find(s => s.id === assigneeId)?.name ?? 'teammate'}`
          : 'Assignee cleared',
      })
      if (ok !== null) refresh()
    })
  }

  function onStatusChange(next: TicketStatus) {
    if (closed) return
    if (next === 'resolved' && !hoursLogged && ticket.status !== 'resolved') {
      if (!hoursBilling) {
        startTransition(async () => {
          const ok = await runWithToast(() => resolveTicketSimple(ticket.id), {
            loading: 'Resolving ticket…',
            success: 'Ticket resolved',
          })
          if (ok !== null) refresh()
        })
        return
      }
      if (
        !canResolveTicket(
          ticket.estimate_status ?? null,
          ticket.completion_status ?? null,
          ticket.status
        )
      ) {
        notifyError('Complete estimate and work approvals before resolving')
        return
      }
      setResolveOpen(true)
      return
    }
    startTransition(async () => {
      const ok = await runWithToast(() => updateTicketStatus(ticket.id, next), {
        success: `Status set to ${formatTicketStatus(next)}`,
      })
      if (ok !== null) refresh()
    })
  }

  return (
    <>
      <div
        className={`tickets-grid tickets-grid--admin tickets-row tickets-row--static tickets-row--${ticket.priority}${statusRowClass}`}
        style={{ ['--row-accent' as string]: accent }}
        data-pending={pending ? 'true' : undefined}
        data-closed={closed ? 'true' : undefined}
      >
        <div className="tickets-cell tickets-cell-status tickets-cell--control" data-label="Status">
          <div className="tickets-cell-value tickets-cell-value--stack">
            {closed ? (
              <StatusPill status={ticket.status} />
            ) : (
              <EditableStatusPill
                value={ticket.status}
                onChange={onStatusChange}
                disabled={pending}
                ariaLabel={`Status for ${ticket.title}`}
              />
            )}
            {hoursBilling && ticket.estimate_status === 'pending_approval' ? (
              <span className="tickets-awaiting-approval-badge">Awaiting estimate</span>
            ) : hoursBilling && ticket.completion_status === 'pending_approval' ? (
              <span className="tickets-awaiting-approval-badge">Awaiting work check</span>
            ) : null}
          </div>
        </div>

        <div className="tickets-cell tickets-cell-priority tickets-cell--control" data-label="Priority">
          <div className="tickets-cell-value">
            {priorityEditable ? (
              <EditablePriorityPill
                value={ticket.priority}
                onChange={onPriorityChange}
                disabled={pending}
                ariaLabel={`Priority for ${ticket.title}`}
              />
            ) : (
              <PriorityBadge priority={ticket.priority} />
            )}
          </div>
        </div>

        <div className="tickets-cell tickets-cell-subject min-w-0">
          <Link href={href} className="tickets-subject-link">
            <span className="tickets-subject-title">{ticket.title}</span>
            <span className="tickets-subject-meta">
              <span className="tickets-subject-id">{formatTicketId(ticket.id)}</span>
              <span className="tickets-subject-dot" aria-hidden>
                ·
              </span>
              <span className="capitalize">{ticket.type}</span>
              {ticket.clientName ? (
                <>
                  <span className="tickets-subject-dot" aria-hidden>
                    ·
                  </span>
                  <span className="tickets-subject-client">{ticket.clientName}</span>
                </>
              ) : null}
            </span>
          </Link>
        </div>

        <div className="tickets-cell tickets-cell-client min-w-0" data-label="Client">
          <div className="tickets-cell-value">
            {retainerDetail ? (
              <ClientRetainerPopover
                clientName={ticket.clientName ?? '—'}
                detail={retainerDetail}
              />
            ) : (
              <span className="tickets-client-name">{ticket.clientName ?? '—'}</span>
            )}
          </div>
        </div>

        <div className="tickets-cell tickets-cell-assignee tickets-cell--control min-w-0" data-label="Assigned">
          <div className="tickets-cell-value">
            {staff.length > 0 ? (
              <EditableAssigneeSelect
                value={ticket.assignedTo ?? null}
                options={staff}
                disabled={pending}
                compact
                ariaLabel={`Assignee for ${ticket.title}`}
                onChange={onAssigneeChange}
              />
            ) : (
              <span
                className={`tickets-assignee-name ${ticket.assigneeName ? '' : 'tickets-assignee-name--empty'}`}
              >
                {ticket.assigneeName ?? 'Unassigned'}
              </span>
            )}
          </div>
        </div>

        {hoursBilling ? (
          <>
            <div className="tickets-cell tickets-cell-hours" data-label="Est">
              <div className="tickets-cell-value">
                {ticket.estimated_hours != null && ticket.estimated_hours > 0 ? (
                  <span className="tickets-hours-estimate tabular-nums">
                    {ticket.estimated_hours.toFixed(1)}h
                  </span>
                ) : (
                  <span className="tickets-hours-muted">—</span>
                )}
              </div>
            </div>

            <div className="tickets-cell tickets-cell-hours" data-label="Actual">
              <div className="tickets-cell-value">
                {ticket.actual_hours != null && ticket.actual_hours > 0 ? (
                  <span className="tickets-hours-actual tabular-nums">
                    {ticket.actual_hours.toFixed(1)}h
                  </span>
                ) : (
                  <span className="tickets-hours-muted">—</span>
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="tickets-cell tickets-cell-hours" data-label="Est">
              <div className="tickets-cell-value">
                <span className="tickets-hours-muted">—</span>
              </div>
            </div>
            <div className="tickets-cell tickets-cell-hours" data-label="Actual">
              <div className="tickets-cell-value">
                <span className="tickets-hours-muted">—</span>
              </div>
            </div>
          </>
        )}

        <div className="tickets-cell tickets-cell-updated" data-label="Updated">
          <div className="tickets-cell-value">
          {ticket.resolved_at &&
          (ticket.status === 'resolved' || ticket.status === 'closed') ? (
            <time
              dateTime={ticket.resolved_at}
              className="tickets-updated tickets-resolved-at"
              title={formatDateTimeHuman(ticket.resolved_at)}
            >
              {formatResolvedAtTable(ticket.resolved_at)}
            </time>
          ) : (
            <time
              dateTime={ticket.updated_at}
              className={recent ? 'tickets-updated-recent' : 'tickets-updated'}
            >
              {formatRelativeTime(ticket.updated_at)}
            </time>
          )}
          </div>
        </div>

        <div className="tickets-cell tickets-cell-action">
          <Link href={href} className="tickets-row-open" aria-label={`Open ${ticket.title}`}>
            <ArrowUpRight size={15} className="tickets-row-chevron" />
          </Link>
        </div>
      </div>

      <ResolveHoursModal
        ticketId={ticket.id}
        ticketTitle={ticket.title}
        estimatedHours={ticket.estimated_hours ?? null}
        open={resolveOpen}
        onClose={() => {
          setResolveOpen(false)
          refresh()
        }}
      />
    </>
  )
}
