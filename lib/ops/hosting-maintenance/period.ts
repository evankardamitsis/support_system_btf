import type { HostingMaintenancePeriod } from '@/lib/ops/financial-offer/types'
import { renewalDateFromPeriodEnd } from '@/lib/retainers/period'

export { renewalDateFromPeriodEnd }

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/

export function isDateOnly(value: string | null | undefined): value is string {
  if (!value?.trim()) return false
  if (!DATE_ONLY_RE.test(value.trim())) return false
  const d = new Date(`${value.trim()}T12:00:00Z`)
  return !Number.isNaN(d.getTime())
}

function parseUtcDate(dateStr: string): Date | null {
  const trimmed = dateStr.trim()
  if (!isDateOnly(trimmed)) return null
  return new Date(`${trimmed}T12:00:00Z`)
}

function formatUtcDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function utcToday(): string {
  return new Date().toISOString().slice(0, 10)
}

export function firstDayOfMonthUtc(monthOffset = 0): string {
  const now = new Date()
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + monthOffset, 1))
  return formatUtcDate(d)
}

function addUtcMonths(dateStr: string, months: number): string {
  const d = parseUtcDate(dateStr)
  if (!d) return dateStr
  d.setUTCMonth(d.getUTCMonth() + months)
  return formatUtcDate(d)
}

function addUtcYears(dateStr: string, years: number): string {
  const d = parseUtcDate(dateStr)
  if (!d) return dateStr
  d.setUTCFullYear(d.getUTCFullYear() + years)
  return formatUtcDate(d)
}

export function daysBetween(start: string, end: string): number {
  const a = parseUtcDate(start)
  const b = parseUtcDate(end)
  if (!a || !b) return 0
  return Math.round((b.getTime() - a.getTime()) / 86400000)
}

export function inclusivePeriodDays(start: string, end: string): number {
  return daysBetween(start, end) + 1
}

/** Inclusive period end from a start date and billing period type. */
export function periodEndFromStart(
  periodStart: string,
  periodType: HostingMaintenancePeriod,
  customDurationDays = 365
): string {
  if (!isDateOnly(periodStart)) return periodStart

  if (periodType === 'month') {
    const nextStart = addUtcMonths(periodStart, 1)
    return addUtcDays(nextStart, -1)
  }

  if (periodType === 'year') {
    const nextStart = addUtcYears(periodStart, 1)
    return addUtcDays(nextStart, -1)
  }

  return addUtcDays(periodStart, Math.max(customDurationDays, 1) - 1)
}

function addUtcDays(dateStr: string, days: number): string {
  const d = parseUtcDate(dateStr)
  if (!d) return dateStr
  d.setUTCDate(d.getUTCDate() + days)
  return formatUtcDate(d)
}

/** Next billing period after the current one ends. */
export function computeRenewedPeriod(input: {
  periodStart: string
  periodEnd: string
  periodType: HostingMaintenancePeriod
}): { periodStart: string; periodEnd: string } {
  const periodStart = renewalDateFromPeriodEnd(input.periodEnd)

  if (input.periodType === 'month') {
    const nextEnd = addUtcMonths(periodStart, 1)
    return { periodStart, periodEnd: addUtcDays(nextEnd, -1) }
  }

  if (input.periodType === 'year') {
    const nextEnd = addUtcYears(periodStart, 1)
    return { periodStart, periodEnd: addUtcDays(nextEnd, -1) }
  }

  const duration = daysBetween(input.periodStart, input.periodEnd)
  return { periodStart, periodEnd: addUtcDays(periodStart, duration) }
}
