'use client'

import { useModalDialog } from '@/lib/ui/use-modal-dialog'
import { cn } from '@/lib/utils'

const confirmButtonClass = {
  danger: 'dash-btn-danger',
  primary: 'dash-btn-primary',
  secondary: 'dash-btn-secondary',
} as const

export function ConfirmDeleteModal({
  open,
  onClose,
  title,
  description,
  confirmLabel = 'Delete',
  confirmVariant = 'danger',
  pendingLabel = 'Working…',
  pending = false,
  error = null,
  onConfirm,
  className,
}: {
  open: boolean
  onClose: () => void
  title: string
  description: React.ReactNode
  confirmLabel?: string
  confirmVariant?: keyof typeof confirmButtonClass
  pendingLabel?: string
  pending?: boolean
  error?: string | null
  onConfirm: () => void
  className?: string
}) {
  const dialogRef = useModalDialog(open, onClose)

  return (
    <dialog ref={dialogRef} className={cn('ticket-modal', className)}>
      {open ? (
        <div className="ticket-modal-inner">
          <h2 className="ticket-modal-title">{title}</h2>
          <div className="ticket-modal-sub">{description}</div>
          {error ? <p className="ticket-modal-error">{error}</p> : null}
          <div className="ticket-modal-actions">
            <button
              type="button"
              className="dash-btn-secondary cursor-pointer"
              onClick={onClose}
              disabled={pending}
            >
              Go back
            </button>
            <button
              type="button"
              className={`${confirmButtonClass[confirmVariant]} cursor-pointer`}
              onClick={onConfirm}
              disabled={pending}
            >
              {pending ? pendingLabel : confirmLabel}
            </button>
          </div>
        </div>
      ) : null}
    </dialog>
  )
}
