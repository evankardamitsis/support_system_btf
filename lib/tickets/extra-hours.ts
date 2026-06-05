import { isTicketClosed } from '@/lib/tickets/closed'
import type { TicketStatus } from '@/lib/types'

export function isExtraHoursWorkActive(
  status: TicketStatus,
  extraHoursActiveAt: string | null | undefined
): boolean {
  return status === 'in_progress' && extraHoursActiveAt != null
}

export function canRequestExtraHours(status: TicketStatus): boolean {
  return isTicketClosed(status)
}

export function canCompleteExtraHoursWork(
  status: TicketStatus,
  extraHoursActiveAt: string | null | undefined
): boolean {
  return isExtraHoursWorkActive(status, extraHoursActiveAt)
}

export function shouldUseStandardResolveFlow(
  status: TicketStatus,
  extraHoursActiveAt: string | null | undefined
): boolean {
  return !isExtraHoursWorkActive(status, extraHoursActiveAt)
}
