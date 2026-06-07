'use client'

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import {
  GlobalModal,
  ModalContextProvider,
  type ModalCloseEvent,
  type ModalCloseSource,
  type ModalProps,
} from 'stream-chat-react'

type PopoverPosition = {
  top: number
  left: number
  width: number
}

const DELETE_POPOVER_WIDTH = 15.5 * 16

function getDeleteMessageAnchor(): PopoverPosition | null {
  const root = document.querySelector('.ops-comms-chat')
  if (!root) return null

  const actionsBox = root.querySelector('.str-chat__message-actions-box--open')
  if (actionsBox) {
    const rect = actionsBox.getBoundingClientRect()
    const width = DELETE_POPOVER_WIDTH
    const left = Math.min(
      Math.max(12, rect.right - width),
      window.innerWidth - width - 12
    )
    return { top: rect.bottom + 8, left, width }
  }

  const deleteAction = Array.from(
    root.querySelectorAll<HTMLElement>('.str-chat__message-actions-list-item-button')
  ).find(button => /delete/i.test(button.textContent ?? button.getAttribute('aria-label') ?? ''))

  if (deleteAction) {
    const rect = deleteAction.getBoundingClientRect()
    const width = DELETE_POPOVER_WIDTH
    const left = Math.min(Math.max(12, rect.left), window.innerWidth - width - 12)
    return { top: rect.bottom + 8, left, width }
  }

  return null
}

function OpsCommsDeleteMessagePopover({
  open,
  children,
  onClose,
  onCloseAttempt,
}: Pick<ModalProps, 'open' | 'onClose' | 'onCloseAttempt'> & { children?: ReactNode }) {
  const popoverRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<PopoverPosition | null>(null)

  const close = useCallback(
    (source: ModalCloseSource = 'button', event: ModalCloseEvent = {} as ModalCloseEvent) => {
      if (onCloseAttempt?.(source, event) === false) return
      onClose?.(event)
    },
    [onClose, onCloseAttempt]
  )

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null)
      return
    }
    setPosition(getDeleteMessageAnchor())
  }, [open])

  useEffect(() => {
    if (!open) return

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') close()
    }

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node
      if (popoverRef.current?.contains(target)) return

      const actionsBox = document.querySelector('.ops-comms-chat .str-chat__message-actions-box--open')
      if (actionsBox?.contains(target)) return

      close()
    }

    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [close, open])

  const contextValue = useMemo(
    () => ({
      close,
      dialogId: 'ops-comms-delete-message-popover',
    }),
    [close]
  )

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
      <ModalContextProvider value={contextValue}>
        <div
          ref={popoverRef}
          className="ops-comms-delete-confirm-popover ops-comms-delete-confirm-popover--message"
          style={style}
          role="presentation"
        >
          <div className="str-chat str-chat__theme-dark ops-comms-delete-message-dialog">
            <div className="str-chat__modal__dialog" role="alertdialog" aria-modal="true">
              {children}
            </div>
          </div>
        </div>
      </ModalContextProvider>
    </div>,
    document.body
  )
}

export function OpsCommsModal(props: ModalProps & { children?: ReactNode }) {
  if (props.role === 'alertdialog') {
    return <OpsCommsDeleteMessagePopover {...props} />
  }

  return <GlobalModal {...props} />
}
