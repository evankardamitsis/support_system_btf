'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { updateTicketPriority, updateTicketStatus } from '@/app/actions/tickets'
import {
  formatTicketId,
  formatRelativeTime,
  priorityAccent,
  isRecentlyUpdated,
  ticketRowStatusClass,
} from '@/lib/tickets/display'
import { EditableStatusPill } from './EditableStatusPill'
import { EditablePriorityPill } from './EditablePriorityPill'
import { ResolveHoursModal } from './ResolveHoursModal'
import type { TicketTableRow } from './TicketsTable'
import { canResolveWithEstimate, isEstimateLocked } from '@/lib/tickets/estimate'
import { formatTicketPriority, formatTicketStatus, notifyError, runWithToast } from '@/lib/notify'
import type { TicketPriority, TicketStatus } from '@/lib/types'

export function AdminTicketRow({
  ticket,
  hrefPrefix,
  hoursLogged,
}: {
  ticket: TicketTableRow
  hrefPrefix: string
  hoursLogged: boolean
}) {
  const router = useRouter()
  const [resolveOpen, setResolveOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const accent = priorityAccent[ticket.priority] ?? priorityAccent.normal
  const recent = isRecentlyUpdated(ticket.updated_at)
  const href = `${hrefPrefix}/${ticket.id}`
  const estimateLocked = isEstimateLocked(ticket.estimate_status ?? null)
  const statusRowClass = ticketRowStatusClass(ticket.status)

  function refresh() {
    router.refresh()
  }

  function onPriorityChange(priority: TicketPriority) {
    startTransition(async () => {
      const ok = await runWithToast(() => updateTicketPriority(ticket.id, priority), {
        success: `Priority set to ${formatTicketPriority(priority)}`,
      })
      if (ok !== null) refresh()
    })
  }

  function onStatusChange(next: TicketStatus) {
    if (next === 'resolved' && !hoursLogged && ticket.status !== 'resolved') {
      if (!canResolveWithEstimate(ticket.estimate_status ?? null, ticket.status)) {
        notifyError('Submit the estimate and get client approval before resolving')
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
      >
        <div className="tickets-cell tickets-cell-status tickets-cell--control">
          <EditableStatusPill
            value={ticket.status}
            onChange={onStatusChange}
            disabled={pending}
            ariaLabel={`Status for ${ticket.title}`}
          />
        </div>

        <div className="tickets-cell tickets-cell-priority tickets-cell--control">
          <EditablePriorityPill
            value={ticket.priority}
            onChange={onPriorityChange}
            disabled={pending || estimateLocked}
            ariaLabel={`Priority for ${ticket.title}`}
          />
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

        <div className="tickets-cell tickets-cell-client min-w-0">
          <span className="tickets-client-name">{ticket.clientName ?? '—'}</span>
        </div>

        <div className="tickets-cell tickets-cell-hours">
          {ticket.estimated_hours != null && ticket.estimated_hours > 0 ? (
            <span className="tickets-hours-estimate tabular-nums">
              {ticket.estimated_hours.toFixed(1)}h
            </span>
          ) : (
            <span className="tickets-hours-muted">—</span>
          )}
        </div>

        <div className="tickets-cell tickets-cell-hours">
          {ticket.actual_hours != null && ticket.actual_hours > 0 ? (
            <span className="tickets-hours-actual tabular-nums">{ticket.actual_hours.toFixed(1)}h</span>
          ) : ticket.status === 'resolved' || ticket.status === 'closed' ? (
            <button
              type="button"
              className="tickets-hours-log-btn"
              onClick={() => setResolveOpen(true)}
            >
              Log hrs
            </button>
          ) : (
            <span className="tickets-hours-muted">—</span>
          )}
        </div>

        <div className="tickets-cell tickets-cell-updated">
          <time
            dateTime={ticket.updated_at}
            className={recent ? 'tickets-updated-recent' : 'tickets-updated'}
          >
            {formatRelativeTime(ticket.updated_at)}
          </time>
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
