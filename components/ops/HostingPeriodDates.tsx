'use client'

import { useMemo } from 'react'
import { DateInput } from '@/components/ui/DateInput'
import type { HostingMaintenancePeriod } from '@/lib/ops/financial-offer/types'
import { formatHostingDate } from '@/lib/ops/hosting-maintenance/display'
import {
  daysBetween,
  firstDayOfMonthUtc,
  inclusivePeriodDays,
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

function periodLengthLabel(
  periodStart: string,
  periodEnd: string,
  periodType: HostingMaintenancePeriod
): string {
  const days = inclusivePeriodDays(periodStart, periodEnd)
  if (periodType === 'month') return '1 month'
  if (periodType === 'year') return '1 year'
  if (days === 1) return '1 day'
  return `${days} days`
}

export function HostingPeriodDates({
  periodType,
  periodStart,
  periodEnd,
  onPeriodStartChange,
  onPeriodEndChange,
  onSyncPeriodEnd,
  endSynced,
  customDurationDays,
  onCustomDurationDaysChange,
  disabled = false,
}: {
  periodType: HostingMaintenancePeriod
  periodStart: string
  periodEnd: string
  onPeriodStartChange: (value: string) => void
  onPeriodEndChange: (value: string, synced?: boolean) => void
  onSyncPeriodEnd: () => void
  endSynced: boolean
  customDurationDays: number
  onCustomDurationDaysChange: (days: number) => void
  disabled?: boolean
}) {
  const computedEnd = useMemo(() => {
    if (!isDateOnly(periodStart)) return periodEnd
    return periodEndFromStart(periodStart, periodType, customDurationDays)
  }, [periodStart, periodType, customDurationDays, periodEnd])

  const summary = useMemo(() => {
    if (!isDateOnly(periodStart) || !isDateOnly(periodEnd)) return null
    const length = periodLengthLabel(periodStart, periodEnd, periodType)
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

  function applyStart(nextStart: string) {
    onPeriodStartChange(nextStart)
  }

  function applyPresetEnd(
    preset: HostingMaintenancePeriod | { customDurationDays: number }
  ) {
    if (!isDateOnly(periodStart)) return

    if (typeof preset === 'string') {
      const nextEnd = periodEndFromStart(periodStart, preset)
      onCustomDurationDaysChange(inclusivePeriodDays(periodStart, nextEnd))
      onPeriodEndChange(nextEnd, true)
      return
    }

    onCustomDurationDaysChange(preset.customDurationDays)
    onPeriodEndChange(periodEndFromStart(periodStart, 'custom', preset.customDurationDays), true)
  }

  const startQuickActions: QuickButton[] = [
    { label: 'Today', onClick: () => applyStart(utcToday()) },
    { label: '1st this month', onClick: () => applyStart(firstDayOfMonthUtc(0)) },
    { label: '1st next month', onClick: () => applyStart(firstDayOfMonthUtc(1)) },
  ]

  const endQuickActions: QuickButton[] =
    periodType === 'custom'
      ? [
          { label: '+1 month', onClick: () => applyPresetEnd('month') },
          { label: '+3 months', onClick: () => applyPresetEnd({ customDurationDays: 92 }) },
          { label: '+6 months', onClick: () => applyPresetEnd({ customDurationDays: 183 }) },
          { label: '+1 year', onClick: () => applyPresetEnd('year') },
        ]
      : !endSynced
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
            {endSynced && periodType !== 'custom' ? (
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
