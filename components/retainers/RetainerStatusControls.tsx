'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  cancelRetainer,
  freezeRetainer,
  resumeRetainer,
  unfreezeRetainer,
} from '@/app/actions/retainers'
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal'
import { StatusFlag } from '@/components/dashboard/StatusFlag'
import {
  RETAINER_STATUS_LABELS,
  retainerStatusMessage,
  type RetainerLifecycleStatus,
} from '@/lib/retainers/status'
import { notifyError, notifySuccess } from '@/lib/notify'

type ConfirmAction = 'freeze' | 'cancel'

const confirmCopy: Record<
  ConfirmAction,
  {
    title: string
    description: React.ReactNode
    confirmLabel: string
    confirmVariant: 'danger' | 'primary' | 'secondary'
    pendingLabel: string
    success: string
  }
> = {
  freeze: {
    title: 'Freeze retainer?',
    description: (
      <>
        Auto-renewal will stop and the client cannot submit new requests or log hours until you
        unfreeze. Existing tickets stay open.
      </>
    ),
    confirmLabel: 'Freeze retainer',
    confirmVariant: 'secondary',
    pendingLabel: 'Freezing…',
    success: 'Retainer frozen',
  },
  cancel: {
    title: 'Cancel retainer?',
    description: (
      <>
        Auto-renewal will stop until you resume. The client cannot submit new requests or log hours
        while canceled. Existing tickets stay open.
      </>
    ),
    confirmLabel: 'Cancel retainer',
    confirmVariant: 'danger',
    pendingLabel: 'Canceling…',
    success: 'Retainer canceled',
  },
}

export function RetainerStatusControls({
  clientId,
  status,
  canManage,
}: {
  clientId: string
  status: RetainerLifecycleStatus
  canManage: boolean
}) {
  const router = useRouter()
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const tone =
    status === 'active' ? 'ok' : status === 'frozen' ? 'warn' : ('danger' as const)

  function openConfirm(action: ConfirmAction) {
    setError(null)
    setConfirmAction(action)
  }

  function closeConfirm() {
    if (pending) return
    setConfirmAction(null)
    setError(null)
  }

  function runConfirmedAction(action: ConfirmAction) {
    const actionFn =
      action === 'freeze'
        ? () => freezeRetainer(clientId)
        : () => cancelRetainer(clientId)

    setError(null)
    startTransition(async () => {
      try {
        await actionFn()
        notifySuccess(confirmCopy[action].success)
        setConfirmAction(null)
        router.refresh()
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Action failed'
        setError(message)
        notifyError(message)
      }
    })
  }

  const modalCopy = confirmAction ? confirmCopy[confirmAction] : null

  return (
    <section className="retainer-lifecycle-panel">
      <div className="retainer-lifecycle-head">
        <div>
          <p className="retainer-lifecycle-eyebrow">Retainer lifecycle</p>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <StatusFlag label={RETAINER_STATUS_LABELS[status]} tone={tone} />
          </div>
        </div>
      </div>
      <p className="dash-meta leading-relaxed mt-3">{retainerStatusMessage(status)}</p>

      {canManage ? (
        <div className="retainer-lifecycle-actions">
          {status === 'active' ? (
            <>
              <button
                type="button"
                className="dash-btn-secondary cursor-pointer"
                disabled={pending}
                onClick={() => openConfirm('freeze')}
              >
                Freeze retainer
              </button>
              <button
                type="button"
                className="dash-btn-danger cursor-pointer"
                disabled={pending}
                onClick={() => openConfirm('cancel')}
              >
                Cancel retainer
              </button>
            </>
          ) : null}

          {status === 'frozen' ? (
            <>
              <button
                type="button"
                className="dash-btn-primary cursor-pointer"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    try {
                      await unfreezeRetainer(clientId)
                      notifySuccess('Retainer unfrozen')
                      router.refresh()
                    } catch (err) {
                      notifyError(err instanceof Error ? err.message : 'Could not unfreeze')
                    }
                  })
                }
              >
                {pending ? 'Working…' : 'Unfreeze'}
              </button>
              <button
                type="button"
                className="dash-btn-danger cursor-pointer"
                disabled={pending}
                onClick={() => openConfirm('cancel')}
              >
                Cancel retainer
              </button>
            </>
          ) : null}

          {status === 'canceled' ? (
            <button
              type="button"
              className="dash-btn-primary cursor-pointer"
              disabled={pending}
              onClick={() =>
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
            >
              {pending ? 'Working…' : 'Resume retainer'}
            </button>
          ) : null}
        </div>
      ) : null}

      {modalCopy ? (
        <ConfirmDeleteModal
          open={confirmAction !== null}
          onClose={closeConfirm}
          title={modalCopy.title}
          description={modalCopy.description}
          confirmLabel={modalCopy.confirmLabel}
          confirmVariant={modalCopy.confirmVariant}
          pendingLabel={modalCopy.pendingLabel}
          pending={pending}
          error={error}
          onConfirm={() => {
            if (confirmAction) runConfirmedAction(confirmAction)
          }}
        />
      ) : null}
    </section>
  )
}
