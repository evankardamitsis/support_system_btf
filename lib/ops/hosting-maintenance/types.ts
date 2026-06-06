import type { HostingMaintenancePeriod } from '@/lib/ops/financial-offer/types'

export type HostingContractStatus = 'active' | 'expired' | 'canceled'

export type HostingContractRecord = {
  id: string
  name: string
  clientId: string
  clientName: string
  clientEmail: string | null
  periodType: HostingMaintenancePeriod
  customPeriod: string | null
  costAmount: number
  periodStart: string
  periodEnd: string
  status: HostingContractStatus
  renewalNotifiedAt: string | null
  notes: string | null
  createdBy: string
  createdAt: string
  updatedAt: string
}

export const HOSTING_CONTRACT_STATUSES: HostingContractStatus[] = ['active', 'expired', 'canceled']

export const HOSTING_CONTRACT_STATUS_LABELS: Record<HostingContractStatus, string> = {
  active: 'Active',
  expired: 'Expired',
  canceled: 'Canceled',
}

export const HOSTING_RENEWAL_REMINDER_DAYS = 14
