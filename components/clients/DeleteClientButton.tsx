'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteClient } from '@/app/actions/clients'
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal'
import { notifyError, notifySuccess } from '@/lib/notify'

export function DeleteClientButton({
  clientId,
  clientName,
  ticketCount,
}: {
  clientId: string
  clientName: string
  ticketCount: number
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function confirmDelete() {
    setError(null)
    startTransition(async () => {
      const result = await deleteClient(clientId)
      if (!result.ok) {
        setError(result.error)
        notifyError(result.error)
        return
      }
      notifySuccess(`${clientName} deleted`)
      setOpen(false)
      router.push('/admin/clients')
      router.refresh()
    })
  }

  return (
    <>
      <section className="admin-danger-zone">
        <h3 className="admin-danger-zone-title">Danger zone</h3>
        <p className="admin-danger-zone-copy">
          Permanently remove this client, all tickets, retainers, invites, and portal
          accounts linked to them.
        </p>
        <button
          type="button"
          className="dash-btn-danger cursor-pointer"
          onClick={() => {
            setError(null)
            setOpen(true)
          }}
        >
          Delete client
        </button>
      </section>

      <ConfirmDeleteModal
        open={open}
        onClose={() => {
          if (!pending) setOpen(false)
        }}
        title="Delete client?"
        description={
          <>
            <strong>{clientName}</strong>
            <br />
            <br />
            This cannot be undone.{' '}
            {ticketCount > 0
              ? `${ticketCount} ticket${ticketCount === 1 ? '' : 's'} and related data will be removed. `
              : null}
            Portal users for this client will lose access.
          </>
        }
        confirmLabel="Delete client"
        pending={pending}
        error={error}
        onConfirm={confirmDelete}
      />
    </>
  )
}
