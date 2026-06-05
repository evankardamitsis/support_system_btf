import { toast } from 'sonner'

export function notifySuccess(message: string) {
  toast.success(message)
}

export function notifyError(message: string) {
  toast.error(message)
}

export function notifyLoading(message: string) {
  return toast.loading(message)
}

export function dismissToast(id: string | number) {
  toast.dismiss(id)
}

export async function runWithToast<T>(
  action: () => Promise<T>,
  messages: { loading?: string; success: string; error?: string }
): Promise<T | null> {
  const id = toast.loading(messages.loading ?? 'Working…')
  try {
    const result = await action()
    toast.success(messages.success, { id })
    return result
  } catch (err) {
    const message =
      err instanceof Error ? err.message : messages.error ?? 'Something went wrong'
    toast.error(message, { id })
    return null
  }
}

export function formatTicketStatus(status: string): string {
  return status.replace(/_/g, ' ')
}

export function formatTicketPriority(priority: string): string {
  return priority.charAt(0).toUpperCase() + priority.slice(1)
}
