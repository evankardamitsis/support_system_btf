import { formatDate } from '@/lib/dates'
import { formatHostingMaintenance, formatOfferCurrency } from '@/lib/ops/financial-offer/calculate'
import type { HostingMaintenancePeriod } from '@/lib/ops/financial-offer/types'
import { HOSTING_RENEWAL_REMINDER_DAYS } from '@/lib/ops/hosting-maintenance/types'

export function formatHostingContractCost(
  amount: number,
  periodType: HostingMaintenancePeriod,
  customPeriod: string | null
): string {
  return (
    formatHostingMaintenance({
      amount,
      period: periodType,
      customPeriod,
    }) ?? formatOfferCurrency(amount)
  )
}

export function formatHostingDate(dateStr: string | null): string {
  return formatDate(dateStr)
}

export function daysUntilExpiry(periodEnd: string): number {
  const today = new Date()
  today.setHours(12, 0, 0, 0)
  const end = new Date(`${periodEnd}T12:00:00`)
  return Math.ceil((end.getTime() - today.getTime()) / 86400000)
}

export function isExpiringSoon(periodEnd: string, status: string): boolean {
  if (status !== 'active') return false
  const days = daysUntilExpiry(periodEnd)
  return days >= 0 && days <= HOSTING_RENEWAL_REMINDER_DAYS
}

export function isPastExpiry(periodEnd: string): boolean {
  return daysUntilExpiry(periodEnd) < 0
}
