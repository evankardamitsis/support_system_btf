'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { approveTicketEstimate } from '@/app/actions/tickets'
import { PriorityBadge } from '@/components/ui/PriorityBadge'
import { formatTicketPriority, runWithToast } from '@/lib/notify'
import type { TicketPriority } from '@/lib/types'

export function EstimateApprovalModal({
  ticketId,
  ticketTitle,
  estimatedHours,
  priority,
}: {
  ticketId: string
  ticketTitle: string
  estimatedHours: number
  priority: TicketPriority
}) {
  const router = useRouter()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [open, setOpen] = useState(true)
  const [pending, startTransition] = useTransition()
  const hoursLabel = estimatedHours.toFixed(2).replace(/\.00$/, '')
  const priorityLabel = formatTicketPriority(priority)

  useEffect(() => {
    const el = dialogRef.current
    if (!el) return
    if (open) el.showModal()
    else el.close()
  }, [open])

  function approve() {
    startTransition(async () => {
      const ok = await runWithToast(() => approveTicketEstimate(ticketId), {
        loading: 'Approving estimate…',
        success: `Approved ${hoursLabel}h at ${priorityLabel} priority`,
      })
      if (ok !== null) {
        setOpen(false)
        router.refresh()
      }
    })
  }

  return (
    <>
      {!open ? (
        <div className="estimate-approval-banner" role="status">
          <div className="estimate-approval-banner-copy">
            <span className="estimate-approval-banner-eyebrow">Action required</span>
            <p className="estimate-approval-banner-title">Approve BTF estimate to continue</p>
            <p className="estimate-approval-banner-meta">
              <span className="tabular-nums">{hoursLabel}h</span>
              <span aria-hidden>·</span>
              <span>{priorityLabel} priority</span>
            </p>
          </div>
          <button
            type="button"
            className="estimate-approval-banner-cta dash-btn-primary btn-primary cursor-pointer"
            onClick={() => setOpen(true)}
          >
            Review & approve
          </button>
        </div>
      ) : null}

      <dialog
        ref={dialogRef}
        className="ticket-modal ticket-modal--estimate"
        onClose={() => setOpen(false)}
      >
        <div className="estimate-modal-inner">
          <header className="estimate-modal-head">
            <span className="estimate-modal-eyebrow">Action required</span>
            <h2 className="estimate-modal-title">Approve BTF estimate</h2>
            <p className="estimate-modal-sub">
              BTF has reviewed <strong className="estimate-modal-ticket">{ticketTitle}</strong> and
              needs your sign-off before work begins.
            </p>
          </header>

          <div className="estimate-modal-stats" aria-label="Estimate details">
            <div className="estimate-modal-stat">
              <span className="estimate-modal-stat-label">Estimated time</span>
              <span className="estimate-modal-stat-value tabular-nums">{hoursLabel}h</span>
            </div>
            <div className="estimate-modal-stat">
              <span className="estimate-modal-stat-label">Priority</span>
              <span className="estimate-modal-stat-priority">
                <PriorityBadge priority={priority} variant="pill" />
              </span>
            </div>
          </div>

          <p className="estimate-modal-footnote">
            Approving confirms both the hours and priority. BTF will start work right after.
          </p>

          <div className="estimate-modal-actions">
            <button
              type="button"
              className="dash-btn-primary btn-primary w-full cursor-pointer"
              disabled={pending}
              onClick={approve}
            >
              {pending ? 'Approving…' : 'Approve estimate'}
            </button>
            <button
              type="button"
              className="estimate-modal-later cursor-pointer"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              Review later
            </button>
          </div>
        </div>
      </dialog>
    </>
  )
}
