export type MetricItem = {
  label: string
  value: string
  hint?: string
  accent?: string
  emphasis?: boolean
}

export function MetricStrip({
  items,
  className = '',
  stagger = 'anim-stagger-2',
}: {
  items: MetricItem[]
  className?: string
  stagger?: string
}) {
  return (
    <div className={`metric-strip ${stagger} ${className}`}>
      {items.map(item => (
        <div
          key={item.label}
          className="metric-card anim-fade-up"
          style={{ ['--metric-accent' as string]: item.accent ?? 'var(--accent)' }}
          data-emphasis={item.emphasis ? 'true' : undefined}
        >
          <p className="metric-card-label">{item.label}</p>
          <p className="metric-card-value">{item.value}</p>
          {item.hint ? <p className="metric-card-hint">{item.hint}</p> : null}
        </div>
      ))}
    </div>
  )
}
