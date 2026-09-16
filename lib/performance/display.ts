export function formatPerformanceCurrency(value: number, currency = 'EUR', compact = false) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    maximumFractionDigits: compact ? 0 : 2,
    notation: compact && Math.abs(value) >= 10_000 ? 'compact' : 'standard',
  }).format(value)
}

export function formatPerformanceNumber(value: number) {
  return new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 }).format(value)
}

export function formatPerformancePercent(value: number | null, digits = 1) {
  return value === null ? '—' : `${value.toFixed(digits)}%`
}

export function formatPerformanceRatio(value: number | null) {
  return value === null ? '—' : `${value.toFixed(2)}×`
}

export function formatSyncTime(value: string | null) {
  if (!value) return 'Never synced'
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function metricDelta(current: number, previous: number) {
  if (previous === 0) return current === 0 ? null : 100
  return ((current - previous) / previous) * 100
}

