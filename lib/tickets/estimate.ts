import type { TicketStatus } from '@/lib/types'

export type EstimateStatus = 'pending_approval' | 'approved' | null

export function canSubmitEstimate(
  estimateStatus: EstimateStatus,
  estimatedHours: number | null,
  status: TicketStatus
): boolean {
  if (status === 'resolved' || status === 'closed') return false
  if (estimateStatus === 'pending_approval' || estimateStatus === 'approved') return false
  return estimatedHours != null && estimatedHours > 0
}

export function canResolveWithEstimate(
  estimateStatus: EstimateStatus,
  status: TicketStatus
): boolean {
  if (status === 'resolved' || status === 'closed') return false
  return estimateStatus === 'approved'
}

export function isEstimateLocked(estimateStatus: EstimateStatus): boolean {
  return estimateStatus === 'pending_approval' || estimateStatus === 'approved'
}
