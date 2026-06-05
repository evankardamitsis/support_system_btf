'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { submitEstimateForApproval, updateTicketEstimatedHours } from '@/app/actions/tickets'
import { logHours } from '@/app/actions/hours'
import { UsageBar } from '@/components/dashboard/UsageBar'
import { runWithToast } from '@/lib/notify'
import {
  canResolveWithEstimate,
  canSubmitEstimate,
  isEstimateLocked,
  type EstimateStatus,
} from '@/lib/tickets/estimate'
import { formatDateTimeHuman } from '@/lib/tickets/display'
import type { TicketStatus } from '@/lib/types'

type RetainerOption = {
  id: string
  period_start: string
  period_end: string
  hours_total: number
  hours_used: number
}

export function TicketDetailSidebar({
  ticketId,
  status,
  resolvedAt,
  estimateStatus,
  estimatedHours,
  actualHours,
  hoursLogged,
  activeRetainer,
  retainers,
  defaultRetainerId,
  onResolve,
}: {
  ticketId: string
  status: TicketStatus
  resolvedAt: string | null
  estimateStatus: EstimateStatus
  estimatedHours: number | null
  actualHours: number | null
  hoursLogged: boolean
  activeRetainer: RetainerOption | null
  retainers: RetainerOption[]
  defaultRetainerId?: string | null
  onResolve: () => void
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

  const showSubmit = canSubmitEstimate(estimateStatus, estimatedHours, status)
  const showAwaiting = estimateStatus === 'pending_approval' && status !== 'resolved' && status !== 'closed'
  const showResolve = canResolveWithEstimate(estimateStatus, status)
  const estimateLocked = isEstimateLocked(estimateStatus)
  const logged =
    actualHours != null && actualHours > 0 ? `${actualHours.toFixed(1)}h` : '—'

  function refresh() {
    router.refresh()
  }

  return (
    <aside className="ticket-detail-aside">
      <section className="ticket-detail-aside-card">
        <h3 className="ticket-detail-aside-title">Time on this ticket</h3>

        <div className="ticket-detail-hours-grid">
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
        </div>

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
        ) : showResolve ? (
          <button
            type="button"
            className="dash-btn-primary btn-primary w-full cursor-pointer mt-4"
            onClick={onResolve}
          >
            Resolve & log hours
          </button>
        ) : hoursLogged ? (
          <p className="ticket-detail-aside-note dash-meta">Hours recorded for this ticket.</p>
        ) : null}

        {resolvedAt && (status === 'resolved' || status === 'closed') ? (
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

      {retainers.length > 0 ? (
        <section className="ticket-detail-aside-card ticket-detail-aside-card--muted">
          <button
            type="button"
            className="ticket-detail-more-toggle"
            onClick={() => setShowMoreLog(v => !v)}
            aria-expanded={showMoreLog}
          >
            <span>Log additional time</span>
            <span aria-hidden>{showMoreLog ? '−' : '+'}</span>
          </button>

          {showMoreLog ? (
            <form
              className="ticket-detail-more-form"
              onSubmit={e => {
                e.preventDefault()
                const formData = new FormData(e.currentTarget)
                const retainerId = formData.get('retainer_id') as string
                const hours = parseFloat(formData.get('hours') as string)
                if (!retainerId || !hours) return
                startTransition(async () => {
                  const ok = await runWithToast(
                    () =>
                      logHours(
                        ticketId,
                        retainerId,
                        Math.round(hours * 60),
                        (formData.get('note') as string) || undefined
                      ),
                    {
                      loading: 'Logging time…',
                      success: `${hours}h added to this ticket`,
                    }
                  )
                  if (ok !== null) {
                    e.currentTarget.reset()
                    refresh()
                  }
                })
              }}
            >
              <p className="dash-meta leading-relaxed">
                After resolving, add more time or split across billing periods.
              </p>
              <select
                name="retainer_id"
                required
                className="dash-select w-full text-sm"
                defaultValue={defaultRetainerId ?? ''}
              >
                <option value="">Billing period…</option>
                {retainers.map(r => (
                  <option key={r.id} value={r.id}>
                    {new Date(r.period_start).toLocaleDateString('en-GB')} (
                    {Number(r.hours_used).toFixed(1)}/{Number(r.hours_total).toFixed(1)}h)
                  </option>
                ))}
              </select>
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
                Add time
              </button>
            </form>
          ) : null}
        </section>
      ) : null}
    </aside>
  )
}
