'use client'

import { PriorityBadge } from '@/components/ui/PriorityBadge'
import type { TicketPriority } from '@/lib/types'

const priorities: TicketPriority[] = ['low', 'normal', 'high', 'critical']

export function EditablePriorityPill({
  value,
  onChange,
  disabled,
  ariaLabel,
  className = '',
}: {
  value: TicketPriority
  onChange: (priority: TicketPriority) => void
  disabled?: boolean
  ariaLabel?: string
  className?: string
}) {
  return (
    <div className={`pill-select pill-select--priority ${className}`} data-editable="true">
      <PriorityBadge priority={value} variant="pill" />
      <select
        className="pill-select-input"
        value={value}
        disabled={disabled}
        aria-label={ariaLabel ?? 'Change priority'}
        onChange={e => onChange(e.target.value as TicketPriority)}
        onClick={e => e.stopPropagation()}
      >
        {priorities.map(p => (
          <option key={p} value={p}>
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </option>
        ))}
      </select>
    </div>
  )
}
