import type { TicketPriority, TicketStatus } from '@/lib/types'

export function formatTicketId(id: string) {
  return `TKT-${id.substring(0, 4).toUpperCase()}`
}

export function formatDateTimeHuman(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Compact resolved timestamp for table cells */
export function formatResolvedAtTable(dateStr: string): string {
  const d = new Date(dateStr)
  const datePart = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  const timePart = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  return `${datePart} · ${timePart}`
}

export function formatRelativeTime(dateStr: string) {
  const m = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export const priorityAccent: Record<TicketPriority, string> = {
  critical: '#f87171',
  high: '#fb923c',
  normal: 'var(--border-2)',
  low: 'var(--border)',
}

export function isRecentlyUpdated(dateStr: string) {
  const h = (Date.now() - new Date(dateStr).getTime()) / 3600000
  return h < 2
}

/** Prominent admin table row tint — open & waiting only */
export function ticketRowStatusClass(status: TicketStatus): string {
  if (status === 'open') return ' tickets-row--status-open'
  if (status === 'waiting_on_client') return ' tickets-row--status-waiting'
  return ''
}

export function ticketRowAwaitingApprovalClass(
  estimateStatus?: 'pending_approval' | 'approved' | null
): string {
  if (estimateStatus === 'pending_approval') return ' tickets-row--awaiting-approval'
  return ''
}
