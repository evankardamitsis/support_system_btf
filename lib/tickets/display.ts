import { formatDate, formatDateTime, formatDateTimeCompact } from '@/lib/dates'
import type { TicketPriority, TicketStatus } from '@/lib/types'

export function formatTicketId(id: string) {
  return `TKT-${id.substring(0, 4).toUpperCase()}`
}

export function formatHoursShort(hours: number): string {
  return `${hours.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1')}h`
}

export function formatDateTimeHuman(dateStr: string): string {
  return formatDateTime(dateStr)
}

/** Compact resolved timestamp for table cells */
export function formatResolvedAtTable(dateStr: string): string {
  return formatDateTimeCompact(dateStr)
}

/** Billing period label for resolved tickets, e.g. "June 2026" */
export function formatResolvedPeriod(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

export function formatRelativeTime(dateStr: string) {
  const m = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return formatDate(dateStr)
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
  if (status === 'on_hold') return ' tickets-row--status-hold'
  return ''
}

export function ticketRowAwaitingApprovalClass(
  estimateStatus?: 'pending_approval' | 'approved' | null,
  completionStatus?: 'pending_approval' | 'approved' | null
): string {
  if (estimateStatus === 'pending_approval' || completionStatus === 'pending_approval') {
    return ' tickets-row--awaiting-approval'
  }
  return ''
}
