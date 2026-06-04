export function UsageBar({
  percent,
  tone = 'ok',
  height = 6,
}: {
  percent: number
  tone?: 'ok' | 'warn' | 'danger' | 'over'
  height?: number
}) {
  const clamped = Math.min(100, Math.max(0, percent))
  const color =
    tone === 'over' || tone === 'danger'
      ? '#f87171'
      : tone === 'warn'
        ? '#fb923c'
        : '#4ade80'

  return (
    <div className="usage-bar" style={{ height }} data-tone={tone}>
      <div
        className="usage-bar-fill"
        style={{
          ['--usage-pct' as string]: `${clamped}%`,
          ['--usage-color' as string]: color,
        }}
      />
    </div>
  )
}
