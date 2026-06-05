import type { TicketStatus } from '@/lib/types'

export function isTicketClosed(status: TicketStatus): boolean {
  return status === 'resolved' || status === 'closed'
}

export const TICKET_LOCKED_MESSAGE =
  'This ticket is resolved and cannot be modified'
