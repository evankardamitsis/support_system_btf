'use client'

import { useEffect, useRef } from 'react'

function isBackdropClick(dialog: HTMLDialogElement, event: MouseEvent) {
  const rect = dialog.getBoundingClientRect()
  return (
    event.clientX < rect.left ||
    event.clientX > rect.right ||
    event.clientY < rect.top ||
    event.clientY > rect.bottom
  )
}

/** Syncs a controlled `open` prop with `<dialog showModal>` and closes on backdrop / Escape. */
export function useModalDialog(open: boolean, onClose: () => void) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const el = dialogRef.current
    if (!el) return
    if (open && !el.open) el.showModal()
    else if (!open && el.open) el.close()
  }, [open])

  useEffect(() => {
    const el = dialogRef.current
    if (!el) return

    function syncClose() {
      onClose()
    }

    function handleClick(event: MouseEvent) {
      const dialog = dialogRef.current
      if (!dialog?.open || !isBackdropClick(dialog, event)) return
      dialog.close()
    }

    el.addEventListener('close', syncClose)
    el.addEventListener('cancel', syncClose)
    el.addEventListener('click', handleClick)
    return () => {
      el.removeEventListener('close', syncClose)
      el.removeEventListener('cancel', syncClose)
      el.removeEventListener('click', handleClick)
    }
  }, [onClose])

  return dialogRef
}
