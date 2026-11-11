'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { cancelRetainer, resumeRetainer } from '@/app/actions/retainers'
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal'
import { notifyError, notifySuccess } from '@/lib/notify'
import type { RetainerLifecycleStatus } from '@/lib/retainers/status'

export function RetainerRowActions({
  clientId,
  clientName,
  status,
}: {
  clientId: string
  clientName: string | null
  status: RetainerLifecycleStatus
}) {
  const router = useRouter()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function runCancel() {
    setError(null)
    startTransition(async () => {
      try {
        await cancelRetainer(clientId)
        notifySuccess('Retainer canceled')
        setConfirmOpen(false)
        router.refresh()
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Could not cancel'
        setError(message)
        notifyError(message)
      }
    })
  }

  function runResume() {
    startTransition(async () => {
      try {
        await resumeRetainer(clientId)
        notifySuccess('Retainer resumed')
        router.refresh()
      } catch (err) {
        notifyError(err instanceof Error ? err.message : 'Could not resume')
      }
    })
  }

  return (
    <>
      {status === 'canceled' ? (
        <button
          type="button"
          className="retainers-row-action cursor-pointer"
          disabled={pending}
          onClick={runResume}
        >
          {pending ? 'Working…' : 'Resume'}
        </button>
      ) : (
        <button
          type="button"
          className="retainers-row-action retainers-row-action-danger cursor-pointer"
          disabled={pending}
          onClick={() => {
            setError(null)
            setConfirmOpen(true)
          }}
        >
          Cancel
        </button>
      )}

      <ConfirmDeleteModal
        open={confirmOpen}
        onClose={() => {
          if (pending) return
          setConfirmOpen(false)
          setError(null)
        }}
        title={`Cancel ${clientName ?? 'this'} retainer?`}
        description={
          <>
            Auto-renewal will stop until you resume. The client cannot submit new requests or log
            hours while canceled. Existing tickets stay open.
          </>
        }
        confirmLabel="Cancel retainer"
        confirmVariant="danger"
        pendingLabel="Canceling…"
        pending={pending}
        error={error}
        onConfirm={runCancel}
      />
    </>
  )
}
