'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { approveExtraHours } from '@/app/actions/extra-hours'
import { runWithToast } from '@/lib/notify'

export type PendingExtraHours = {
  id: string
  minutes: number
  note: string | null
  submitted_at: string
}

function formatHours(minutes: number): string {
  const hours = minutes / 60
  return `${hours.toFixed(2).replace(/\.00$/, '')}h`
}

export function ExtraHoursApprovalModal({
  ticketTitle,
  pending,
}: {
  ticketTitle: string
  pending: PendingExtraHours[]
}) {
  const router = useRouter()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [open, setOpen] = useState(true)
  const [isApproving, startTransition] = useTransition()
  const [remaining, setRemaining] = useState(pending)

  useEffect(() => {
    setRemaining(pending)
  }, [pending])

  useEffect(() => {
    const el = dialogRef.current
    if (!el) return
    if (open && remaining.length > 0) el.showModal()
    else el.close()
  }, [open, remaining.length])

  function approve(id: string, hoursLabel: string) {
    startTransition(async () => {
      const ok = await runWithToast(() => approveExtraHours(id), {
        loading: 'Approving extra hours…',
        success: `${hoursLabel} approved and billed to your retainer`,
      })
      if (ok !== null) {
        setRemaining(prev => {
          const next = prev.filter(item => item.id !== id)
          if (next.length === 0) setOpen(false)
          return next
        })
        router.refresh()
      }
    })
  }

  if (remaining.length === 0) return null

  return (
    <>
      {!open ? (
        <div className="estimate-approval-banner" role="status">
          <div className="estimate-approval-banner-copy">
            <span className="estimate-approval-banner-eyebrow">Action required</span>
            <p className="estimate-approval-banner-title">Approve extra hours</p>
            <p className="estimate-approval-banner-meta">
              BTF has requested additional time on this resolved ticket.
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
            <h2 className="estimate-modal-title">Approve extra hours</h2>
            <p className="estimate-modal-sub">
              BTF has requested additional time on{' '}
              <strong className="estimate-modal-ticket">{ticketTitle}</strong>. Approve each
              request before it is billed to your retainer.
            </p>
          </header>

          <ul className="extra-hours-approval-list">
            {remaining.map(item => {
              const hoursLabel = formatHours(item.minutes)
              return (
                <li key={item.id} className="extra-hours-approval-item">
                  <div className="extra-hours-approval-copy">
                    <span className="extra-hours-approval-hours tabular-nums">{hoursLabel}</span>
                    {item.note ? (
                      <p className="extra-hours-approval-note">{item.note}</p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className="dash-btn-primary btn-primary cursor-pointer shrink-0"
                    disabled={isApproving}
                    onClick={() => approve(item.id, hoursLabel)}
                  >
                    {isApproving ? 'Approving…' : 'Approve'}
                  </button>
                </li>
              )
            })}
          </ul>

          <div className="estimate-modal-actions">
            <button
              type="button"
              className="estimate-modal-later cursor-pointer"
              disabled={isApproving}
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
