'use client'

import { Toaster } from 'sonner'

export function AppToaster() {
  return (
    <Toaster
      theme="dark"
      position="bottom-right"
      closeButton
      duration={4200}
      toastOptions={{
        classNames: {
          toast: 'btf-toast',
          title: 'btf-toast-title',
          description: 'btf-toast-description',
          actionButton: 'btf-toast-action',
          cancelButton: 'btf-toast-cancel',
          closeButton: 'btf-toast-close',
          success: 'btf-toast--success',
          error: 'btf-toast--error',
          loading: 'btf-toast--loading',
        },
      }}
    />
  )
}
