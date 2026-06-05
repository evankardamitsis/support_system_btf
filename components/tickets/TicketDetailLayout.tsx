'use client'

import { useState, useTransition, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  updateTicketPriority,
  updateTicketStatus,
} from '@/app/actions/tickets'
import { EditableStatusPill } from './EditableStatusPill'
import { EditablePriorityPill } from './EditablePriorityPill'
import { ResolveHoursModal } from './ResolveHoursModal'
import { TicketDetailSidebar } from './TicketDetailSidebar'
import { DeleteTicketButton } from './DeleteTicketButton'
import { formatDateTimeHuman, formatTicketId } from '@/lib/tickets/display'
import {
  canResolveWithEstimate,
  isEstimateLocked,
  type EstimateStatus,
} from '@/lib/tickets/estimate'
import { formatTicketPriority, formatTicketStatus, notifyError, runWithToast } from '@/lib/notify'
import type { TicketPriority, TicketStatus } from '@/lib/types'

type RetainerOption = {
  id: string
  period_start: string
  period_end: string
  hours_total: number
  hours_used: number
}

export function TicketDetailLayout({
  children,
  ticketId,
  title,
  status,
  priority,
  type,
  clientId,
  clientName,
  createdAt,
  updatedAt,
  resolvedAt,
  description,
  estimateStatus,
  estimatedHours,
  actualHours,
  hoursLogged,
  activeRetainer,
  retainers,
  defaultRetainerId,
  isAdmin = false,
}: {
  children: ReactNode
  ticketId: string
  title: string
  status: TicketStatus
  priority: TicketPriority
  type: string
  clientId: string
  clientName: string | null
  createdAt: string
  updatedAt: string
  resolvedAt: string | null
  description: string | null
  estimateStatus: EstimateStatus
  estimatedHours: number | null
  actualHours: number | null
  hoursLogged: boolean
  activeRetainer: RetainerOption | null
  retainers: RetainerOption[]
  defaultRetainerId?: string | null
  isAdmin?: boolean
}) {
  const router = useRouter()
  const [resolveOpen, setResolveOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  function refresh() {
    router.refresh()
  }

  const priorityLocked = isEstimateLocked(estimateStatus)

  function onStatusChange(next: TicketStatus) {
    if (next === 'resolved' && !hoursLogged && status !== 'resolved') {
      if (!canResolveWithEstimate(estimateStatus, status)) {
        notifyError('Submit the estimate and get client approval before resolving')
        return
      }
      setResolveOpen(true)
      return
    }
    startTransition(async () => {
      const ok = await runWithToast(() => updateTicketStatus(ticketId, next), {
        loading: 'Updating status…',
        success: `Status set to ${formatTicketStatus(next)}`,
      })
      if (ok !== null) refresh()
    })
  }

  const opened = new Date(createdAt).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  const updated = new Date(updatedAt).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  })

  return (
    <>
      <header className="ticket-detail-head anim-fade-up anim-fade-up-1">
        <div className="ticket-detail-head-grid">
          <div className="ticket-detail-head-copy min-w-0">
            <p className="ticket-detail-eyebrow">
              <span className="dash-ticket-id">{formatTicketId(ticketId)}</span>
              {clientName ? (
                <>
                  <span className="ticket-detail-sep" aria-hidden>
                    ·
                  </span>
                  <Link href={`/admin/clients/${clientId}`} className="ticket-detail-client-link">
                    {clientName}
                  </Link>
                </>
              ) : null}
              <span className="ticket-detail-sep" aria-hidden>
                ·
              </span>
              <span className="capitalize">{type}</span>
            </p>
            <h1 className="ticket-detail-title">{title}</h1>
            <p className="ticket-detail-dates">
              Opened {opened}
              <span className="ticket-detail-sep" aria-hidden>
                {' '}
                ·{' '}
              </span>
              Updated {updated}
              {resolvedAt && (status === 'resolved' || status === 'closed') ? (
                <>
                  <span className="ticket-detail-sep" aria-hidden>
                    {' '}
                    ·{' '}
                  </span>
                  <span className="ticket-detail-resolved-at">
                    Resolved {formatDateTimeHuman(resolvedAt)}
                  </span>
                </>
              ) : null}
            </p>
          </div>

          <div
            className="ticket-detail-controls"
            data-pending={pending ? 'true' : undefined}
          >
            <div className="ticket-detail-control">
              <span className="ticket-detail-control-label">Status</span>
              <EditableStatusPill
                value={status}
                onChange={onStatusChange}
                disabled={pending}
                ariaLabel="Change ticket status"
              />
            </div>
            <div className="ticket-detail-control">
              <span className="ticket-detail-control-label">Priority</span>
              <EditablePriorityPill
                value={priority}
                onChange={next =>
                  startTransition(async () => {
                    const ok = await runWithToast(() => updateTicketPriority(ticketId, next), {
                      loading: 'Updating priority…',
                      success: `Priority set to ${formatTicketPriority(next)}`,
                    })
                    if (ok !== null) refresh()
                  })
                }
                disabled={pending || priorityLocked}
                ariaLabel="Change ticket priority"
              />
            </div>
          </div>
        </div>
      </header>

      {description ? (
        <section className="ticket-detail-brief anim-fade-up anim-fade-up-2">
          <h2 className="ticket-detail-brief-label">Request</h2>
          <p className="ticket-detail-brief-body">{description}</p>
        </section>
      ) : null}

      <div className="ticket-detail-layout anim-fade-up anim-fade-up-3">
        <div className="ticket-detail-main">{children}</div>

        <TicketDetailSidebar
          ticketId={ticketId}
          status={status}
          resolvedAt={resolvedAt}
          estimateStatus={estimateStatus}
          estimatedHours={estimatedHours}
          actualHours={actualHours}
          hoursLogged={hoursLogged}
          activeRetainer={activeRetainer}
          retainers={retainers}
          defaultRetainerId={defaultRetainerId}
          onResolve={() => setResolveOpen(true)}
        />
      </div>

      {isAdmin ? <DeleteTicketButton ticketId={ticketId} ticketTitle={title} /> : null}

      <ResolveHoursModal
        ticketId={ticketId}
        ticketTitle={title}
        estimatedHours={estimatedHours}
        open={resolveOpen}
        onClose={() => {
          setResolveOpen(false)
          refresh()
        }}
      />
    </>
  )
}
