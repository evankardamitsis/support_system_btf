'use client'

interface HoursGaugeProps {
  used: number
  total: number
  size?: 'sm' | 'lg'
}

export function HoursGauge({ used, total, size = 'lg' }: HoursGaugeProps) {
  const pct = total > 0 ? Math.min(1, used / total) : 0
  const isLg = size === 'lg'

  // SVG arc: semicircle, 180° sweep, viewBox 300×170
  // Radius 120, center 150,155, start (30,155) → end (270,155)
  const r = isLg ? 110 : 70
  const cx = isLg ? 150 : 90
  const cy = isLg ? 130 : 85
  const vw = isLg ? 300 : 180
  const vh = isLg ? 150 : 100
  const sw = isLg ? 8 : 5

  // Arc total length (half-circumference)
  const arcTotal = Math.PI * r
  const arcOffset = arcTotal * (1 - pct)

  const startX = cx - r
  const endX = cx + r
  const y = cy

  const trackColor = pct > 0.85 ? 'var(--danger)' : pct > 0.6 ? 'var(--warning)' : 'var(--accent)'

  return (
    <svg
      viewBox={`0 0 ${vw} ${vh}`}
      width={vw}
      height={vh}
      aria-label={`${Math.round(pct * 100)}% retainer used`}
    >
      {/* Background track */}
      <path
        d={`M ${startX} ${y} A ${r} ${r} 0 0 1 ${endX} ${y}`}
        fill="none"
        stroke="var(--border-2)"
        strokeWidth={sw}
        strokeLinecap="butt"
      />
      {/* Fill track */}
      {pct > 0 && (
        <path
          d={`M ${startX} ${y} A ${r} ${r} 0 0 1 ${endX} ${y}`}
          fill="none"
          stroke={trackColor}
          strokeWidth={sw}
          strokeLinecap="butt"
          strokeDasharray={arcTotal}
          className="arc-fill"
          style={
            {
              '--arc-total': arcTotal,
              '--arc-offset': arcOffset,
              strokeDashoffset: arcTotal,
            } as React.CSSProperties
          }
        />
      )}
      {/* Center label */}
      {isLg && (
        <>
          <text
            x={cx}
            y={cy - 12}
            textAnchor="middle"
            fill="var(--text-1)"
            fontSize="22"
            fontFamily="var(--font-dm-mono)"
            fontWeight="500"
          >
            {used.toFixed(1)} / {total.toFixed(0)} HRS
          </text>
          <text
            x={cx}
            y={cy + 10}
            textAnchor="middle"
            fill="var(--text-3)"
            fontSize="9"
            fontFamily="var(--font-dm-mono)"
            letterSpacing="0.1em"
          >
            THIS PERIOD
          </text>
        </>
      )}
    </svg>
  )
}
