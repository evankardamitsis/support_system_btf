import { formatPackageName } from '@/lib/retainers/packages'

export function PackageChip({
  packageName,
  className = '',
}: {
  packageName: string | null | undefined
  className?: string
}) {
  const pkg =
    packageName === 'grow'
      ? 'grow'
      : packageName === 'care'
        ? 'care'
        : packageName === 'fixed'
          ? 'fixed'
          : null
  const label = formatPackageName(packageName)

  return (
    <span
      className={`package-chip ${pkg ? `package-chip--${pkg}` : ''} ${className}`}
      data-package={pkg ?? undefined}
    >
      {label}
    </span>
  )
}
