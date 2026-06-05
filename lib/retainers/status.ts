export type RetainerLifecycleStatus = 'active' | 'frozen' | 'canceled'

export const RETAINER_STATUS_LABELS: Record<RetainerLifecycleStatus, string> = {
  active: 'Active',
  frozen: 'Frozen',
  canceled: 'Canceled',
}

export function canAutoRenewRetainer(status: RetainerLifecycleStatus): boolean {
  return status === 'active'
}

export function canUseRetainerHours(status: RetainerLifecycleStatus): boolean {
  return status === 'active'
}

export function retainerStatusMessage(status: RetainerLifecycleStatus): string {
  if (status === 'frozen') {
    return 'This retainer is frozen — auto-renewal, new client requests, and hour logging are paused.'
  }
  if (status === 'canceled') {
    return 'This retainer is canceled — auto-renewal, new client requests, and hour logging are stopped.'
  }
  return 'Auto-renewal is on. A new billing period starts after the current period ends.'
}
