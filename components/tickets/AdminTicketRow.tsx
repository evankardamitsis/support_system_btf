'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { ArrowUpRight } from 'lucide-react'
import {
  updateTicketPriority,
  updateTicketEstimatedHours,
  updateTicketStatus,
} from '@/app/actions/tickets'
import {
  formatTicketId,
  formatRelativeTime,
  priorityAccent,
  isRecentlyUpdated,
} from '@/lib/tickets/display'
import { EditableStatusPill } from './EditableStatusPill'
import { EditablePriorityPill } from './EditablePriorityPill'
import { ResolveHoursModal } from './ResolveHoursModal'
import type { TicketTableRow } from './TicketsTable'
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

  function refresh() {
    router.refresh()
  }

  function onPriorityChange(priority: TicketPriority) {
    startTransition(async () => {
      await updateTicketPriority(ticket.id, priority)
      refresh()
    })
  }

  function onEstimateBlur(raw: string) {
    const parsed = raw.trim() === '' ? null : parseFloat(raw)
    const next =
      parsed == null || Number.isNaN(parsed) ? null : Math.max(0, parsed)
    const current = ticket.estimated_hours ?? null
    if (next === current || (next != null && current != null && next === current)) return
    startTransition(async () => {
      await updateTicketEstimatedHours(ticket.id, next)
      refresh()
    })
  }

  function onStatusChange(next: TicketStatus) {
    if (next === 'resolved' && !hoursLogged && ticket.status !== 'resolved') {
      setResolveOpen(true)
      return
    }
    startTransition(async () => {
      await updateTicketStatus(ticket.id, next)
      refresh()
    })
  }

  return (
    <>
      <div
        className={`tickets-grid tickets-grid--admin tickets-row tickets-row--static tickets-row--${ticket.priority}`}
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
            disabled={pending}
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

        <div className="tickets-cell tickets-cell-hours tickets-cell--control">
          <input
            type="number"
            step="0.25"
            min="0"
            className="dash-input-cell tabular-nums"
            defaultValue={ticket.estimated_hours ?? ''}
            placeholder="Est"
            aria-label={`Estimated hours for ${ticket.title}`}
            onBlur={e => onEstimateBlur(e.target.value)}
            onClick={e => e.stopPropagation()}
          />
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
