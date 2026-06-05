import type { TicketStatus } from '@/lib/types'

export function isTicketClosed(status: TicketStatus): boolean {
  return status === 'resolved' || status === 'closed'
}

export function canEditTicketPriority(status: TicketStatus): boolean {
  return !isTicketClosed(status)
}

export const TICKET_LOCKED_MESSAGE =
  'This ticket is resolved and cannot be modified'

export const TICKET_PRIORITY_LOCKED_MESSAGE =
  'Priority cannot be changed on resolved or closed tickets'
