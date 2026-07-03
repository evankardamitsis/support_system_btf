'use client'

import { useState, useTransition } from 'react'
import { useModalDialog } from '@/lib/ui/use-modal-dialog'
import { resolveTicketWithHours } from '@/app/actions/tickets'
import { useResolveCelebration } from '@/components/admin/ResolveCelebrationProvider'
import { runWithToast } from '@/lib/notify'
import { requiresHoursOverageNote } from '@/lib/tickets/hours-overage'
import { isHoursBasedPackage } from '@/lib/retainers/billing-model'
import { ResolveOverageNoteField } from './ResolveOverageNoteField'
import { ResolveRetainerCard, type RetainerOption } from './ResolveRetainerCard'

function retainerOverageMinutes(retainer: RetainerOption | null, hours: string): number {
  if (!retainer || !isHoursBasedPackage(retainer.package_name)) return 0
  const parsed = parseFloat(hours)
  if (Number.isNaN(parsed) || parsed <= 0) return 0
  const afterResolve = Number(retainer.hours_used) + parsed
  const overBy = afterResolve - Number(retainer.hours_total)
  return overBy > 0 ? overBy : 0
}

function ResolveHoursForm({
  ticketId,
  ticketTitle,
  estimatedHours,
  activeRetainer,
  onClose,
}: {
  ticketId: string
  ticketTitle: string
  estimatedHours: number | null
  activeRetainer: RetainerOption | null
  onClose: () => void
}) {
  const [hours, setHours] = useState(
    () => (estimatedHours != null ? String(estimatedHours) : '')
  )
  const [overageNote, setOverageNote] = useState('')
  const [deferOverage, setDeferOverage] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const celebrate = useResolveCelebration()

  const overageHours = retainerOverageMinutes(activeRetainer, hours) / 60

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const value = parseFloat(hours)
    if (!value || value <= 0) {
      setError('Enter hours spent (e.g. 1.5)')
      return
    }
    if (requiresHoursOverageNote(estimatedHours, value) && !overageNote.trim()) {
      setError('Explain why more hours were needed — the client will see this note')
      return
    }
    const deferring = deferOverage && overageHours > 0
    startTransition(async () => {
      const ok = await runWithToast(
        () =>
          resolveTicketWithHours(ticketId, value, overageNote.trim() || undefined, deferring),
        {
          loading: 'Resolving ticket…',
          success: result =>
            result.deferredHours > 0
              ? `Ticket resolved — ${result.loggedHours.toFixed(2)}h logged, ${result.deferredHours.toFixed(2)}h deferred to next period`
              : `Ticket resolved — ${result.loggedHours.toFixed(2)}h logged to retainer`,
        }
      )
      if (ok === null) {
        setError('Could not resolve ticket')
        return
      }
      setError(null)
      onClose()
      celebrate()
    })
  }

  return (
    <form method="dialog" onSubmit={submit} className="ticket-modal-inner">
      <h2 className="ticket-modal-title">Resolve ticket</h2>
      <p className="ticket-modal-sub">
        Log actual hours for <span className="text-(--text-1)">{ticketTitle}</span> — they
        count toward the client&apos;s retainer.
      </p>

      {activeRetainer && (
        <ResolveRetainerCard retainer={activeRetainer} actualHours={hours} />
      )}

      {overageHours > 0 && (
        <label className="flex items-start gap-2 cursor-pointer mt-2">
          <input
            type="checkbox"
            checked={deferOverage}
            onChange={e => setDeferOverage(e.target.checked)}
            className="mt-0.5"
          />
          <span className="text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>
            Defer {overageHours.toFixed(2)}h over cap to next period
          </span>
        </label>
      )}

      <label className="dash-label" htmlFor={`resolve-hours-${ticketId}`}>
        Actual hours spent
      </label>
      <input
        id={`resolve-hours-${ticketId}`}
        type="number"
        step="0.25"
        min="0.25"
        required
        value={hours}
        onChange={e => setHours(e.target.value)}
        className="btf-input w-full tabular-nums"
        placeholder="e.g. 2.5"
        autoFocus
      />
      {estimatedHours != null ? (
        <p className="dash-meta mt-2">Estimated: {estimatedHours.toFixed(2)}h</p>
      ) : null}
      <ResolveOverageNoteField
        id={`resolve-overage-${ticketId}`}
        estimatedHours={estimatedHours}
        actualHoursInput={hours}
        value={overageNote}
        onChange={setOverageNote}
      />
      {error ? <p className="ticket-modal-error">{error}</p> : null}
      <div className="ticket-modal-actions">
        <button
          type="button"
          className="dash-btn-secondary cursor-pointer"
          onClick={onClose}
          disabled={pending}
        >
          Cancel
        </button>
        <button type="submit" className="dash-btn-primary btn-primary cursor-pointer" disabled={pending}>
          {pending ? 'Saving…' : 'Resolve & log hours'}
        </button>
      </div>
    </form>
  )
}

export function ResolveHoursModal({
  ticketId,
  ticketTitle,
  estimatedHours,
  activeRetainer = null,
  open,
  onClose,
}: {
  ticketId: string
  ticketTitle: string
  estimatedHours: number | null
  activeRetainer?: RetainerOption | null
  open: boolean
  onClose: () => void
}) {
  const dialogRef = useModalDialog(open, onClose)

  return (
    <dialog ref={dialogRef} className="ticket-modal">
      {open ? (
        <ResolveHoursForm
          key={`${ticketId}-${estimatedHours ?? ''}`}
          ticketId={ticketId}
          ticketTitle={ticketTitle}
          estimatedHours={estimatedHours}
          activeRetainer={activeRetainer}
          onClose={onClose}
        />
      ) : null}
    </dialog>
  )
}
