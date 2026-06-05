import { isTicketClosed } from '@/lib/tickets/closed'
import type { EstimateStatus } from '@/lib/tickets/estimate'
import type { TicketStatus } from '@/lib/types'

export type CompletionStatus = 'pending_approval' | 'approved' | null

export function canSubmitWorkForCheck(
  estimateStatus: EstimateStatus,
  completionStatus: CompletionStatus,
  status: TicketStatus
): boolean {
  if (isTicketClosed(status)) return false
  if (estimateStatus !== 'approved') return false
  if (completionStatus !== null) return false
  return true
}

export function canResolveTicket(
  estimateStatus: EstimateStatus,
  completionStatus: CompletionStatus,
  status: TicketStatus
): boolean {
  if (isTicketClosed(status)) return false
  if (estimateStatus !== 'approved') return false
  if (completionStatus === 'pending_approval') return false
  return true
}

export function isAwaitingWorkApproval(completionStatus: CompletionStatus): boolean {
  return completionStatus === 'pending_approval'
}
