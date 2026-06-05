'use client'

import { useEffect, useRef } from 'react'

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
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const el = dialogRef.current
    if (!el) return
    if (open) el.showModal()
    else el.close()
  }, [open])

  return (
    <dialog ref={dialogRef} className="ticket-modal" onClose={onClose}>
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
