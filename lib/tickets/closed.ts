import type { TicketStatus } from '@/lib/types'

export function isTicketClosed(status: TicketStatus): boolean {
  return status === 'resolved' || status === 'closed'
}
