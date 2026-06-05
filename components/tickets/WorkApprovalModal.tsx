'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { approveTicketWork, disputeTicketWork } from '@/app/actions/tickets'
import { runWithToast } from '@/lib/notify'

export function WorkApprovalModal({
  ticketId,
  ticketTitle,
}: {
  ticketId: string
  ticketTitle: string
}) {
  const router = useRouter()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [open, setOpen] = useState(true)
  const [mode, setMode] = useState<'review' | 'dispute'>('review')
  const [concerns, setConcerns] = useState('')
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    const el = dialogRef.current
    if (!el) return
    if (open) el.showModal()
    else el.close()
  }, [open])

  useEffect(() => {
    if (!open) {
      setMode('review')
      setConcerns('')
    }
  }, [open])

  function approve() {
    startTransition(async () => {
      const ok = await runWithToast(() => approveTicketWork(ticketId), {
        loading: 'Approving work…',
        success: 'Work approved — BTF will close the ticket shortly',
      })
      if (ok !== null) {
        setOpen(false)
        router.refresh()
      }
    })
  }

  function dispute() {
    startTransition(async () => {
      const ok = await runWithToast(() => disputeTicketWork(ticketId, concerns), {
        loading: 'Sending dispute…',
        success: 'Dispute sent — BTF will continue working on this ticket',
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
            <p className="estimate-approval-banner-title">Review completed work</p>
            <p className="estimate-approval-banner-meta">
              BTF has finished work on this request and needs your sign-off.
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
          {mode === 'review' ? (
            <>
              <header className="estimate-modal-head">
                <span className="estimate-modal-eyebrow">Action required</span>
                <h2 className="estimate-modal-title">Approve completed work</h2>
                <p className="estimate-modal-sub">
                  BTF has completed <strong className="estimate-modal-ticket">{ticketTitle}</strong>.
                  Review the conversation and activity, then approve so we can close the ticket and log
                  final hours.
                </p>
              </header>

              <p className="estimate-modal-footnote">
                Approving confirms you are satisfied with the work delivered. BTF will then resolve the
                ticket and log time against your retainer.
              </p>

              <div className="estimate-modal-actions">
                <button
                  type="button"
                  className="dash-btn-primary btn-primary w-full cursor-pointer"
                  disabled={pending}
                  onClick={approve}
                >
                  {pending ? 'Approving…' : 'Approve completed work'}
                </button>
                <button
                  type="button"
                  className="estimate-modal-dispute cursor-pointer"
                  disabled={pending}
                  onClick={() => setMode('dispute')}
                >
                  Dispute completion
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
            </>
          ) : (
            <>
              <header className="estimate-modal-head">
                <span className="estimate-modal-eyebrow">Dispute completion</span>
                <h2 className="estimate-modal-title">Tell us what still needs work</h2>
                <p className="estimate-modal-sub">
                  Describe what is missing or incorrect on{' '}
                  <strong className="estimate-modal-ticket">{ticketTitle}</strong>. BTF will continue
                  working on the ticket and submit it for your review again when ready.
                </p>
              </header>

              <label className="dash-label" htmlFor={`work-dispute-${ticketId}`}>
                Your concerns
              </label>
              <textarea
                id={`work-dispute-${ticketId}`}
                rows={5}
                required
                minLength={10}
                value={concerns}
                onChange={e => setConcerns(e.target.value)}
                className="btf-input w-full resize-y estimate-modal-dispute-input"
                placeholder="Explain what still needs to be fixed or completed…"
                autoFocus
              />

              <div className="estimate-modal-actions">
                <button
                  type="button"
                  className="dash-btn-primary btn-primary w-full cursor-pointer"
                  disabled={pending || concerns.trim().length < 10}
                  onClick={dispute}
                >
                  {pending ? 'Sending…' : 'Submit dispute'}
                </button>
                <button
                  type="button"
                  className="estimate-modal-later cursor-pointer"
                  disabled={pending}
                  onClick={() => setMode('review')}
                >
                  Back to approval
                </button>
              </div>
            </>
          )}
        </div>
      </dialog>
    </>
  )
}
