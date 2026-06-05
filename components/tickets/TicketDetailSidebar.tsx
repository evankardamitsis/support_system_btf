'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import {
  submitEstimateForApproval,
  submitWorkForClientCheck,
  updateTicketEstimatedHours,
} from '@/app/actions/tickets'
import { completeExtraHoursWork, submitExtraHours } from '@/app/actions/extra-hours'
import { UsageBar } from '@/components/dashboard/UsageBar'
import { runWithToast } from '@/lib/notify'
import { isTicketClosed } from '@/lib/tickets/closed'
import {
  canResolveTicket,
  canSubmitWorkForCheck,
  isAwaitingWorkApproval,
  type CompletionStatus,
} from '@/lib/tickets/completion'
import {
  canSubmitEstimate,
  isEstimateLocked,
  type EstimateStatus,
} from '@/lib/tickets/estimate'
import {
  canCompleteExtraHoursWork,
  canRequestExtraHours,
  isExtraHoursWorkActive,
  shouldUseStandardResolveFlow,
} from '@/lib/tickets/extra-hours'
import { formatDateTimeHuman } from '@/lib/tickets/display'
import type { TicketStatus } from '@/lib/types'

type RetainerOption = {
  id: string
  period_start: string
  period_end: string
  hours_total: number
  hours_used: number
}

export type ExtraHoursItem = {
  id: string
  minutes: number
  note: string | null
  status: 'pending_approval' | 'approved'
  submitted_at: string
  approved_at: string | null
  period_start: string
  period_end: string
}

export function TicketDetailSidebar({
  ticketId,
  status,
  resolvedAt,
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
  onResolve,
  onResolveOffline,
}: {
  ticketId: string
  status: TicketStatus
  resolvedAt: string | null
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
  onResolve: () => void
  onResolveOffline: () => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [showMoreLog, setShowMoreLog] = useState(false)

  const used = activeRetainer ? Number(activeRetainer.hours_used) : 0
  const total = activeRetainer ? Number(activeRetainer.hours_total) : 0
  const remaining = total - used
  const pct = total > 0 ? Math.min(100, (used / total) * 100) : 0
  const isOver = remaining < 0
  const isDanger = pct > 85
  const tone = isOver ? 'over' : isDanger ? 'warn' : 'ok'

  const closed = isTicketClosed(status)
  const extraHoursActive = isExtraHoursWorkActive(status, extraHoursActiveAt)
  const showCompleteExtraWork = canCompleteExtraHoursWork(status, extraHoursActiveAt)
  const standardResolveFlow = shouldUseStandardResolveFlow(status, extraHoursActiveAt)
  const showSubmit = !closed && standardResolveFlow && canSubmitEstimate(estimateStatus, estimatedHours, status)
  const showAwaiting =
    !closed && estimateStatus === 'pending_approval' && status !== 'resolved' && status !== 'closed'
  const showAwaitingWork = !closed && isAwaitingWorkApproval(completionStatus)
  const showSubmitWork =
    !closed && standardResolveFlow && canSubmitWorkForCheck(estimateStatus, completionStatus, status)
  const showResolve =
    !closed && standardResolveFlow && canResolveTicket(estimateStatus, completionStatus, status)
  const showDisputeNote = !closed && completionDisputeNote && completionStatus === null
  const estimateLocked = closed || isEstimateLocked(estimateStatus)
  const logged =
    actualHours != null && actualHours > 0 ? `${actualHours.toFixed(1)}h` : '—'
  const approvedExtraMinutes = extraHours
    .filter(item => item.status === 'approved')
    .reduce((sum, item) => sum + item.minutes, 0)
  const extraHoursLabel =
    approvedExtraMinutes > 0
      ? `${(approvedExtraMinutes / 60).toFixed(1)}h`
      : '—'
  const pendingExtraCount = extraHours.filter(item => item.status === 'pending_approval').length

  function refresh() {
    router.refresh()
  }

  return (
    <aside className="ticket-detail-aside">
      <section className="ticket-detail-aside-card">
        <h3 className="ticket-detail-aside-title">Time on this ticket</h3>

        <div
          className="ticket-detail-hours-grid"
          data-has-extra={closed || extraHoursActive || approvedExtraMinutes > 0 ? 'true' : undefined}
        >
          <div className="ticket-detail-hours-field">
            <label className="ticket-detail-control-label" htmlFor="detail-estimate">
              Estimate
            </label>
            <input
              id="detail-estimate"
              type="number"
              step="0.25"
              min="0"
              className="btf-input w-full text-sm tabular-nums"
              defaultValue={estimatedHours ?? ''}
              placeholder="—"
              disabled={pending || estimateLocked}
              onBlur={e => {
                const raw = e.target.value
                const next = raw.trim() === '' ? null : parseFloat(raw)
                startTransition(async () => {
                  const value = next == null || Number.isNaN(next) ? null : next
                  const ok = await runWithToast(
                    () => updateTicketEstimatedHours(ticketId, value),
                    {
                      success:
                        value != null ? `Estimate set to ${value}h` : 'Estimate cleared',
                    }
                  )
                  if (ok !== null) refresh()
                })
              }}
            />
          </div>
          <div className="ticket-detail-hours-readout">
            <span className="ticket-detail-control-label">Logged</span>
            <span
              className="ticket-detail-hours-logged tabular-nums"
              data-filled={logged !== '—' ? 'true' : undefined}
            >
              {logged}
            </span>
          </div>
          {closed || extraHoursActive || approvedExtraMinutes > 0 ? (
            <div className="ticket-detail-hours-readout">
              <span className="ticket-detail-control-label">Extra</span>
              <span
                className="ticket-detail-hours-logged tabular-nums"
                data-filled={extraHoursLabel !== '—' ? 'true' : undefined}
              >
                {extraHoursLabel}
              </span>
            </div>
          ) : null}
        </div>

        {closed && hoursOverageNote ? (
          <div className="ticket-hours-overage-note" role="note">
            <span className="ticket-detail-control-label">Client note (over estimate)</span>
            <p className="ticket-hours-overage-note-body">{hoursOverageNote}</p>
          </div>
        ) : null}

        {showSubmit ? (
          <button
            type="button"
            className="dash-btn-primary btn-primary w-full cursor-pointer mt-4"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const ok = await runWithToast(() => submitEstimateForApproval(ticketId), {
                  loading: 'Sending estimate to client…',
                  success: 'Estimate sent — waiting for client approval',
                })
                if (ok !== null) refresh()
              })
            }
          >
            {pending ? 'Submitting…' : 'Submit estimate'}
          </button>
        ) : showAwaiting ? (
          <div className="ticket-estimate-awaiting" role="status">
            <span className="ticket-estimate-awaiting-eyebrow">Awaiting client</span>
            <p className="ticket-estimate-awaiting-text">
              Client must approve the estimate and priority before work continues.
            </p>
          </div>
        ) : showAwaitingWork ? (
          <div className="ticket-estimate-awaiting" role="status">
            <span className="ticket-estimate-awaiting-eyebrow">Awaiting client</span>
            <p className="ticket-estimate-awaiting-text">
              Client must review and approve the completed work before you can resolve and log hours.
            </p>
          </div>
        ) : showResolve || showSubmitWork ? (
          <div className="ticket-detail-resolve-actions mt-4 flex flex-col gap-2">
            {showResolve ? (
              <button
                type="button"
                className="dash-btn-primary btn-primary w-full cursor-pointer"
                onClick={onResolve}
              >
                Resolve & log hours
              </button>
            ) : null}
            {showSubmitWork ? (
              <button
                type="button"
                className="dash-btn-secondary w-full cursor-pointer justify-center"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const ok = await runWithToast(() => submitWorkForClientCheck(ticketId), {
                      loading: 'Notifying client…',
                      success: 'Client notified — waiting for work approval',
                    })
                    if (ok !== null) refresh()
                  })
                }
              >
                {pending ? 'Sending…' : 'Submit for client check'}
              </button>
            ) : null}
          </div>
        ) : showCompleteExtraWork ? (
          <div className="ticket-detail-resolve-actions mt-4 flex flex-col gap-2">
            <p className="ticket-detail-aside-note dash-meta">
              Extra hours approved — complete the additional work, then mark resolved to bill{' '}
              {approvedExtraMinutes > 0
                ? `${(approvedExtraMinutes / 60).toFixed(1)}h`
                : 'the approved time'}{' '}
              to the retainer.
            </p>
            <button
              type="button"
              className="dash-btn-primary btn-primary w-full cursor-pointer"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await runWithToast(() => completeExtraHoursWork(ticketId), {
                    loading: 'Updating ticket…',
                    success: data =>
                      data.billedHours > 0
                        ? `Resolved — ${data.billedHours}h extra billed to retainer`
                        : 'Extra work completed — ticket resolved',
                  })
                  if (result !== null) refresh()
                })
              }
            >
              {pending ? 'Saving…' : 'Mark resolved'}
            </button>
          </div>
        ) : hoursLogged && closed ? (
          <p className="ticket-detail-aside-note dash-meta">Hours recorded for this ticket.</p>
        ) : null}

        {showDisputeNote ? (
          <div className="ticket-work-disputed" role="status">
            <span className="ticket-work-disputed-eyebrow">Client disputed completion</span>
            <p className="ticket-work-disputed-text">{completionDisputeNote}</p>
            <p className="ticket-work-disputed-hint dash-meta">
              Address the concerns, continue work, then submit for client check again.
            </p>
          </div>
        ) : null}

        {isAdmin && !closed ? (
          <div className="ticket-detail-offline-resolve mt-4">
            <button
              type="button"
              className="dash-btn-secondary w-full cursor-pointer justify-center"
              disabled={pending}
              onClick={onResolveOffline}
            >
              Resolved offline
            </button>
            <p className="ticket-detail-aside-note dash-meta">
              Clears pending client approvals and resolves with logged hours.
            </p>
          </div>
        ) : null}

        {closed ? (
          <p className="ticket-detail-aside-note dash-meta">This ticket is resolved — no further edits.</p>
        ) : null}

        {resolvedAt && closed ? (
          <p className="ticket-detail-resolved-readout">
            <span className="ticket-detail-control-label">Resolved</span>
            <time dateTime={resolvedAt}>{formatDateTimeHuman(resolvedAt)}</time>
          </p>
        ) : null}
      </section>

      {activeRetainer ? (
        <section className="ticket-detail-aside-card ticket-detail-aside-card--muted">
          <h3 className="ticket-detail-aside-title">Client retainer</h3>
          <p className="ticket-detail-retainer-period tabular-nums">
            {new Date(activeRetainer.period_start).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
            })}
            {' – '}
            {new Date(activeRetainer.period_end).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </p>
          <div className="ticket-detail-retainer-row">
            <span className="tabular-nums">
              {used.toFixed(1)}
              <span className="ticket-detail-retainer-sep">/</span>
              {total.toFixed(0)}h used
            </span>
            <span className="ticket-detail-retainer-left tabular-nums" data-tone={tone}>
              {isOver ? '−' : ''}
              {Math.abs(remaining).toFixed(1)}h left
            </span>
          </div>
          <UsageBar percent={pct} tone={tone} height={5} />
        </section>
      ) : (
        <section className="ticket-detail-aside-card ticket-detail-aside-card--muted">
          <p className="dash-meta leading-relaxed">No active retainer period for this client.</p>
        </section>
      )}

      {(canRequestExtraHours(status) || extraHours.length > 0 || extraHoursActive) && activeRetainer ? (
        <section className="ticket-detail-aside-card ticket-detail-aside-card--muted">
          {canRequestExtraHours(status) ? (
            <button
              type="button"
              className="ticket-detail-more-toggle"
              onClick={() => setShowMoreLog(v => !v)}
              aria-expanded={showMoreLog}
            >
              <span>Request extra time</span>
              <span aria-hidden>{showMoreLog ? '−' : '+'}</span>
            </button>
          ) : (
            <h3 className="ticket-detail-aside-title">Extra hours</h3>
          )}

          {extraHoursActive ? (
            <p className="ticket-detail-aside-note dash-meta">
              Ticket reopened for approved extra-hours work.
            </p>
          ) : null}

          {extraHours.length > 0 ? (
            <ul className="ticket-extra-hours-list">
              {extraHours.map(item => {
                const hours = (item.minutes / 60).toFixed(2).replace(/\.00$/, '')
                const period = `${new Date(item.period_start).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${new Date(item.period_end).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
                return (
                  <li key={item.id} className="ticket-extra-hours-item">
                    <div className="ticket-extra-hours-item-main">
                      <span className="tabular-nums">{hours}h</span>
                      <span
                        className="ticket-extra-hours-status"
                        data-status={item.status}
                      >
                        {item.status === 'pending_approval' ? 'Awaiting client' : 'Approved'}
                      </span>
                    </div>
                    <span className="dash-meta">{period}</span>
                    {item.note ? <span className="dash-meta">{item.note}</span> : null}
                  </li>
                )
              })}
            </ul>
          ) : null}

          {pendingExtraCount > 0 ? (
            <p className="ticket-detail-aside-note dash-meta">
              {pendingExtraCount} request{pendingExtraCount === 1 ? '' : 's'} awaiting client approval.
            </p>
          ) : null}

          {canRequestExtraHours(status) && showMoreLog ? (
            <form
              className="ticket-detail-more-form"
              onSubmit={e => {
                e.preventDefault()
                const form = e.currentTarget
                const formData = new FormData(form)
                const hours = parseFloat(formData.get('hours') as string)
                const note = (formData.get('note') as string) || undefined
                if (!hours) return
                startTransition(async () => {
                  const ok = await runWithToast(
                    () => submitExtraHours(ticketId, Math.round(hours * 60), note),
                    {
                      loading: 'Sending request…',
                      success: `${hours}h sent to client for approval`,
                    }
                  )
                  if (ok !== null) {
                    form.reset()
                    setShowMoreLog(false)
                    refresh()
                  }
                })
              }}
            >
              <p className="dash-meta leading-relaxed">
                Request additional hours on this resolved ticket. The client must approve before
                time is billed to the current retainer period (
                {new Date(activeRetainer.period_start).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                })}
                {' – '}
                {new Date(activeRetainer.period_end).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
                ).
              </p>
              <input
                name="hours"
                type="number"
                step="0.25"
                min="0.25"
                required
                placeholder="Hours"
                className="btf-input w-full text-sm"
              />
              <input name="note" placeholder="Note (optional)" className="btf-input w-full text-sm" />
              <button type="submit" className="dash-btn-secondary w-full cursor-pointer justify-center">
                Send to client
              </button>
            </form>
          ) : null}
        </section>
      ) : null}
    </aside>
  )
}
