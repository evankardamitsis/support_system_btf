export const RETAINER_PACKAGES = ['care', 'grow', 'fixed'] as const
export type RetainerPackage = (typeof RETAINER_PACKAGES)[number]

export const PACKAGE_LABELS: Record<RetainerPackage, string> = {
  care: 'Care',
  grow: 'Grow',
  fixed: 'Fixed',
}

export function formatPackageName(pkg: string | null | undefined): string {
  if (pkg === 'care' || pkg === 'grow' || pkg === 'fixed') return PACKAGE_LABELS[pkg]
  return pkg ?? '—'
}

export function parseRetainerPackage(raw: string | null | undefined): RetainerPackage {
  if (raw === 'grow') return 'grow'
  if (raw === 'fixed') return 'fixed'
  return 'care'
}

/** Admin-only — BTF internal contract value */
export function formatPeriodCost(amount: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function isActivePeriod(periodStart: string, periodEnd: string, onDate = new Date()): boolean {
  const day = onDate.toISOString().slice(0, 10)
  return periodStart <= day && periodEnd >= day
}
