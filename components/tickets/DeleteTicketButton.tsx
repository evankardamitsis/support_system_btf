'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteTicket } from '@/app/actions/tickets'
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal'
import { formatTicketId } from '@/lib/tickets/display'
import { notifyError, notifySuccess } from '@/lib/notify'

export function DeleteTicketButton({
  ticketId,
  ticketTitle,
}: {
  ticketId: string
  ticketTitle: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function confirmDelete() {
    setError(null)
    startTransition(async () => {
      const result = await deleteTicket(ticketId)
      if (!result.ok) {
        setError(result.error)
        notifyError(result.error)
        return
      }
      notifySuccess('Ticket deleted')
      setOpen(false)
      router.push('/admin/tickets')
      router.refresh()
    })
  }

  return (
    <>
      <section className="admin-danger-zone">
        <h3 className="admin-danger-zone-title">Danger zone</h3>
        <p className="admin-danger-zone-copy">
          Permanently remove this ticket, its conversation, and any logged hours.
        </p>
        <button
          type="button"
          className="dash-btn-danger cursor-pointer"
          onClick={() => {
            setError(null)
            setOpen(true)
          }}
        >
          Delete ticket
        </button>
      </section>

      <ConfirmDeleteModal
        open={open}
        onClose={() => {
          if (!pending) setOpen(false)
        }}
        title="Delete ticket?"
        description={
          <>
            <strong>{formatTicketId(ticketId)}</strong> — {ticketTitle}
            <br />
            <br />
            This cannot be undone. All comments and hours logged on this ticket will be
            removed.
          </>
        }
        confirmLabel="Delete ticket"
        pending={pending}
        error={error}
        onConfirm={confirmDelete}
      />
    </>
  )
}
