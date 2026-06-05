'use client'

import { useId, useState } from 'react'
import { ChevronDown } from 'lucide-react'

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
  foldLabel = 'Stats',
}: {
  items: MetricItem[]
  className?: string
  stagger?: string
  foldLabel?: string
}) {
  const [open, setOpen] = useState(false)
  const panelId = useId()

  return (
    <div className={`metric-strip-wrap ${open ? 'is-open' : ''} ${className}`.trim()}>
      <button
        type="button"
        className="metric-strip-toggle"
        onClick={() => setOpen(prev => !prev)}
        aria-expanded={open}
        aria-controls={panelId}
      >
        <span className="metric-strip-toggle-label">{foldLabel}</span>
        <span className="metric-strip-toggle-preview" aria-hidden>
          {items.slice(0, 2).map((item, index) => (
            <span key={item.label} className="metric-strip-toggle-chip">
              {index > 0 ? <span className="metric-strip-toggle-sep">·</span> : null}
              <span className="metric-strip-toggle-chip-value">{item.value}</span>
              <span className="metric-strip-toggle-chip-label">{item.label}</span>
            </span>
          ))}
          {items.length > 2 ? (
            <span className="metric-strip-toggle-more">+{items.length - 2}</span>
          ) : null}
        </span>
        <ChevronDown size={16} className="metric-strip-toggle-icon" aria-hidden />
      </button>

      <div id={panelId} className={`metric-strip ${stagger}`}>
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
    </div>
  )
}
