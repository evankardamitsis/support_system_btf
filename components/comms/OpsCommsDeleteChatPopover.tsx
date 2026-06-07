'use client'

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'
type PopoverPosition = {
  top: number
  left: number
  width: number
}

type OpsCommsDeleteChatPopoverProps = {
  open: boolean
  anchorRef: RefObject<HTMLElement | null>
  title: string
  description: React.ReactNode
  confirmLabel?: string
  pendingLabel?: string
  pending?: boolean
  error?: string | null
  onClose: () => void
  onConfirm: () => void
}

const POPOVER_WIDTH = 17.5 * 16

function getAnchorPosition(anchor: HTMLElement): PopoverPosition {
  const rect = anchor.getBoundingClientRect()
  const width = POPOVER_WIDTH
  const left = Math.min(
    Math.max(12, rect.right - width),
    window.innerWidth - width - 12
  )

  return {
    top: rect.bottom + 8,
    left,
    width,
  }
}

export function OpsCommsDeleteChatPopover({
  open,
  anchorRef,
  title,
  description,
  confirmLabel = 'Delete chat',
  pendingLabel = 'Deleting…',
  pending = false,
  error = null,
  onClose,
  onConfirm,
}: OpsCommsDeleteChatPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<PopoverPosition | null>(null)

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) {
      setPosition(null)
      return
    }

    setPosition(getAnchorPosition(anchorRef.current))
  }, [anchorRef, open])

  useEffect(() => {
    if (!open) return

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !pending) onClose()
    }

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node
      if (popoverRef.current?.contains(target)) return
      if (anchorRef.current?.contains(target)) return
      if (!pending) onClose()
    }

    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [anchorRef, onClose, open, pending])

  if (!open || typeof document === 'undefined') return null

  const style = position
    ? {
        top: `${position.top}px`,
        left: `${position.left}px`,
        width: `${position.width}px`,
      }
    : undefined

  return createPortal(
    <div data-theme="dashboard">
      <div
        ref={popoverRef}
        className="ops-comms-delete-confirm-popover"
        style={style}
        role="presentation"
      >
        <div className="ticket-modal" role="alertdialog" aria-modal="true">
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
                className="dash-btn-danger cursor-pointer"
                onClick={onConfirm}
                disabled={pending}
              >
                {pending ? pendingLabel : confirmLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
