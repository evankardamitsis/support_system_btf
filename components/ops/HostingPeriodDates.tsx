'use client'

import { useMemo } from 'react'
import { DateInput } from '@/components/ui/DateInput'
import type { HostingMaintenancePeriod } from '@/lib/ops/financial-offer/types'
import { formatHostingDate } from '@/lib/ops/hosting-maintenance/display'
import {
  daysBetween,
  firstDayOfMonthUtc,
  isDateOnly,
  periodEndFromStart,
  utcToday,
} from '@/lib/ops/hosting-maintenance/period'

type QuickButton = { label: string; onClick: () => void }

function DateQuickActions({ actions, disabled }: { actions: QuickButton[]; disabled?: boolean }) {
  if (actions.length === 0) return null

  return (
    <div className="hosting-date-quick-actions">
      {actions.map(action => (
        <button
          key={action.label}
          type="button"
          className="hosting-date-quick-btn"
          disabled={disabled}
          onClick={action.onClick}
        >
          {action.label}
        </button>
      ))}
    </div>
  )
}

function periodLengthLabel(periodType: HostingMaintenancePeriod): string {
  if (periodType === 'month') return '1 month'
  if (periodType === '3month') return '3 months'
  if (periodType === '6month') return '6 months'
  return '1 year'
}

export function HostingPeriodDates({
  periodType,
  periodStart,
  periodEnd,
  onPeriodStartChange,
  onPeriodEndChange,
  onSyncPeriodEnd,
  endSynced,
  disabled = false,
}: {
  periodType: HostingMaintenancePeriod
  periodStart: string
  periodEnd: string
  onPeriodStartChange: (value: string) => void
  onPeriodEndChange: (value: string, synced?: boolean) => void
  onSyncPeriodEnd: () => void
  endSynced: boolean
  disabled?: boolean
}) {
  const computedEnd = useMemo(() => {
    if (!isDateOnly(periodStart)) return periodEnd
    return periodEndFromStart(periodStart, periodType)
  }, [periodStart, periodType, periodEnd])

  const summary = useMemo(() => {
    if (!isDateOnly(periodStart) || !isDateOnly(periodEnd)) return null
    const length = periodLengthLabel(periodType)
    const untilExpiry = daysBetween(utcToday(), periodEnd)
    const expiryHint =
      untilExpiry < 0
        ? `Expired ${Math.abs(untilExpiry)} day${Math.abs(untilExpiry) === 1 ? '' : 's'} ago`
        : untilExpiry === 0
          ? 'Expires today'
          : `${untilExpiry} day${untilExpiry === 1 ? '' : 's'} left`

    return {
      range: `${formatHostingDate(periodStart)} → ${formatHostingDate(periodEnd)}`,
      length,
      expiryHint,
    }
  }, [periodStart, periodEnd, periodType])

  const startQuickActions: QuickButton[] = [
    { label: 'Today', onClick: () => onPeriodStartChange(utcToday()) },
    { label: '1st this month', onClick: () => onPeriodStartChange(firstDayOfMonthUtc(0)) },
    { label: '1st next month', onClick: () => onPeriodStartChange(firstDayOfMonthUtc(1)) },
  ]

  const endQuickActions: QuickButton[] = !endSynced
    ? [{ label: 'Match period', onClick: onSyncPeriodEnd }]
    : []

  return (
    <section className="hosting-period-dates">
      {summary ? (
        <div className="hosting-period-dates-summary">
          <p className="hosting-period-dates-range">{summary.range}</p>
          <p className="hosting-period-dates-meta">
            <span>{summary.length}</span>
            <span aria-hidden>·</span>
            <span>{summary.expiryHint}</span>
            {endSynced ? (
              <>
                <span aria-hidden>·</span>
                <span className="hosting-period-dates-auto">Auto expiry</span>
              </>
            ) : null}
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="hosting-period-dates-field">
          <label className="dash-label" htmlFor="hosting-period-start">
            Period start
          </label>
          <DateInput
            id="hosting-period-start"
            value={periodStart}
            onChange={onPeriodStartChange}
            disabled={disabled}
            required
          />
          <DateQuickActions actions={startQuickActions} disabled={disabled} />
        </div>

        <div className="hosting-period-dates-field">
          <div className="hosting-period-dates-label-row">
            <label className="dash-label" htmlFor="hosting-period-end">
              Expires
            </label>
            {!endSynced && periodEnd !== computedEnd ? (
              <span className="hosting-period-dates-custom-badge">Custom</span>
            ) : null}
          </div>
          <DateInput
            id="hosting-period-end"
            value={periodEnd}
            min={periodStart}
            onChange={value => onPeriodEndChange(value)}
            disabled={disabled}
            required
          />
          <DateQuickActions actions={endQuickActions} disabled={disabled} />
        </div>
      </div>
    </section>
  )
}
