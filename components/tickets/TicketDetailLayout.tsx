'use client'

import { useState, useTransition, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  resolveTicketSimple,
  updateTicketAssignee,
  updateTicketPriority,
  updateTicketStatus,
  updateTicketTitle,
} from '@/app/actions/tickets'
import { StatusPill } from '@/components/ui/StatusPill'
import { PriorityBadge } from '@/components/ui/PriorityBadge'
import { EditableStatusPill } from './EditableStatusPill'
import { EditablePriorityPill } from './EditablePriorityPill'
import {
  AssigneeLabel,
  EditableAssigneeSelect,
  type AssigneeOption,
} from './EditableAssigneeSelect'
import { useResolveCelebration } from '@/components/admin/ResolveCelebrationProvider'
import { ResolveHoursModal } from './ResolveHoursModal'
import { ResolveOfflineModal } from './ResolveOfflineModal'
import { EditableTicketDescription } from '@/components/tickets/EditableTicketDescription'
import { TicketDetailSidebar, type ExtraHoursItem } from './TicketDetailSidebar'
import { DeleteTicketButton } from './DeleteTicketButton'
import { TicketCommsButton } from '@/components/comms/TicketCommsButton'
import { formatDate } from '@/lib/dates'
import { formatDateTimeHuman, formatTicketId } from '@/lib/tickets/display'
import { completeExtraHoursWork } from '@/app/actions/extra-hours'
import { canEditTicketPriority, isTicketClosed } from '@/lib/tickets/closed'
import { isExtraHoursWorkActive, shouldUseStandardResolveFlow } from '@/lib/tickets/extra-hours'
import type { CompletionStatus } from '@/lib/tickets/completion'
import { canResolveTicket } from '@/lib/tickets/completion'
import {
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
  package_name?: string | null
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
  completionStatus,
  estimatedHours,
  actualHours,
  hoursLogged,
  activeRetainer,
  extraHours = [],
  extraHoursActiveAt = null,
  completionDisputeNote = null,
  hoursOverageNote = null,
  isAdmin = false,
  canEditTicketDetails = false,
  hoursBilling = true,
  retainerTracksHours = true,
  noHours = false,
  assignedTo = null,
  staffOptions = [],
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
  completionStatus: CompletionStatus
  estimatedHours: number | null
  actualHours: number | null
  hoursLogged: boolean
  activeRetainer: RetainerOption | null
  extraHours?: ExtraHoursItem[]
  extraHoursActiveAt?: string | null
  completionDisputeNote?: string | null
  hoursOverageNote?: string | null
  isAdmin?: boolean
  canEditTicketDetails?: boolean
  hoursBilling?: boolean
  retainerTracksHours?: boolean
  noHours?: boolean
  assignedTo?: string | null
  staffOptions?: AssigneeOption[]
}) {
  const router = useRouter()
  const celebrate = useResolveCelebration()
  const [resolveOpen, setResolveOpen] = useState(false)
  const [resolveOfflineOpen, setResolveOfflineOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  function refresh() {
    router.refresh()
  }

  const closed = isTicketClosed(status)
  const priorityEditable = canEditTicketPriority(status)

  function onStatusChange(next: TicketStatus) {
    if (closed) return
    if (isExtraHoursWorkActive(status, extraHoursActiveAt) && next === 'resolved') {
      startTransition(async () => {
        const result = await runWithToast(() => completeExtraHoursWork(ticketId), {
          loading: 'Updating ticket…',
          success: data =>
            data.billedHours > 0
              ? `Resolved — ${data.billedHours}h extra billed to retainer`
              : 'Extra work completed — ticket resolved',
        })
        if (result !== null) {
          celebrate()
          refresh()
        }
      })
      return
    }
    if (
      next === 'resolved' &&
      shouldUseStandardResolveFlow(status, extraHoursActiveAt) &&
      !hoursLogged &&
      status !== 'resolved'
    ) {
      if (hoursBilling) {
        if (!canResolveTicket(estimateStatus, completionStatus, status)) {
          notifyError('Complete estimate and work approvals before resolving')
          return
        }
        setResolveOpen(true)
        return
      }
      startTransition(async () => {
        const ok = await runWithToast(() => resolveTicketSimple(ticketId), {
          loading: 'Resolving ticket…',
          success: 'Ticket resolved',
        })
        if (ok !== null) {
          celebrate()
          refresh()
        }
      })
      return
    }
    startTransition(async () => {
      const ok = await runWithToast(() => updateTicketStatus(ticketId, next), {
        loading: 'Updating status…',
        success: `Status set to ${formatTicketStatus(next)}`,
      })
      if (ok !== null) {
        if (next === 'resolved') celebrate()
        refresh()
      }
    })
  }

  const opened = formatDate(createdAt)
  const updated = formatDate(updatedAt)

  return (
    <>
      <header
        className="ticket-detail-head anim-fade-up anim-fade-up-1"
        data-ticket-closed={closed ? 'true' : undefined}
      >
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
              {noHours ? (
                <>
                  <span className="ticket-detail-sep" aria-hidden>
                    ·
                  </span>
                  <span className="ticket-no-hours-badge">No hours</span>
                </>
              ) : null}
            </p>
            <div className="ticket-detail-title-row">
              {canEditTicketDetails ? (
                <input
                  key={title}
                  type="text"
                  className="ticket-detail-title ticket-detail-title-input"
                  defaultValue={title}
                  disabled={pending}
                  aria-label="Ticket title"
                  onBlur={event => {
                    const next = event.target.value.trim()
                    if (!next || next === title) return
                    startTransition(async () => {
                      const ok = await runWithToast(() => updateTicketTitle(ticketId, next), {
                        success: 'Title updated',
                      })
                      if (ok !== null) refresh()
                    })
                  }}
                  onKeyDown={event => {
                    if (event.key === 'Enter') {
                      event.currentTarget.blur()
                    }
                  }}
                />
              ) : (
                <h1 className="ticket-detail-title">{title}</h1>
              )}
              <TicketCommsButton ticketId={ticketId} />
            </div>
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

          {closed ? (
            <div className="ticket-detail-controls ticket-detail-controls--readonly">
              {staffOptions.length > 0 ? (
                <div className="ticket-detail-control ticket-detail-control--assignee">
                  <span className="ticket-detail-control-label">Assigned</span>
                  <AssigneeLabel value={assignedTo} options={staffOptions} />
                </div>
              ) : null}
              <StatusPill status={status} />
              <PriorityBadge priority={priority} />
            </div>
          ) : (
            <div
              className="ticket-detail-controls"
              data-pending={pending ? 'true' : undefined}
            >
              {staffOptions.length > 0 ? (
                <div className="ticket-detail-control ticket-detail-control--assignee">
                  <span className="ticket-detail-control-label">Assigned</span>
                  <EditableAssigneeSelect
                    value={assignedTo}
                    options={staffOptions}
                    disabled={pending}
                    ariaLabel="Change assignee"
                    onChange={next =>
                      startTransition(async () => {
                        const ok = await runWithToast(() => updateTicketAssignee(ticketId, next), {
                          loading: 'Updating assignee…',
                          success: next
                            ? `Assigned to ${staffOptions.find(s => s.id === next)?.name ?? 'teammate'}`
                            : 'Assignee cleared',
                        })
                        if (ok !== null) refresh()
                      })
                    }
                  />
                </div>
              ) : null}
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
                {priorityEditable ? (
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
                    disabled={pending}
                    ariaLabel="Change ticket priority"
                  />
                ) : (
                  <PriorityBadge priority={priority} />
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      <EditableTicketDescription
        ticketId={ticketId}
        description={description}
        editable={canEditTicketDetails}
      />

      <div className="ticket-detail-layout anim-fade-up anim-fade-up-3">
        <div className="ticket-detail-main">{children}</div>

        <TicketDetailSidebar
          ticketId={ticketId}
          status={status}
          resolvedAt={resolvedAt}
          estimateStatus={estimateStatus}
          completionStatus={completionStatus}
          estimatedHours={estimatedHours}
          actualHours={actualHours}
          hoursLogged={hoursLogged}
          activeRetainer={activeRetainer}
          extraHours={extraHours}
          extraHoursActiveAt={extraHoursActiveAt}
          completionDisputeNote={completionDisputeNote}
          hoursOverageNote={hoursOverageNote}
          isAdmin={isAdmin}
          hoursBilling={hoursBilling}
          retainerTracksHours={retainerTracksHours}
          noHours={noHours}
          onResolve={() => {
            if (hoursBilling) {
              setResolveOpen(true)
              return
            }
            startTransition(async () => {
              const ok = await runWithToast(() => resolveTicketSimple(ticketId), {
                loading: 'Resolving ticket…',
                success: 'Ticket resolved',
              })
              if (ok !== null) {
                celebrate()
                refresh()
              }
            })
          }}
          onResolveOffline={() => setResolveOfflineOpen(true)}
        />
      </div>

      {isAdmin && !closed ? (
        <DeleteTicketButton ticketId={ticketId} ticketTitle={title} />
      ) : null}

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

      <ResolveOfflineModal
        ticketId={ticketId}
        ticketTitle={title}
        estimatedHours={estimatedHours}
        open={resolveOfflineOpen}
        onClose={() => {
          setResolveOfflineOpen(false)
          refresh()
        }}
      />
    </>
  )
}
