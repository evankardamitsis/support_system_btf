'use client'

import { StatusPill } from '@/components/ui/StatusPill'
import type { TicketStatus } from '@/lib/types'

const statuses: { value: TicketStatus; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'waiting_on_client', label: 'Waiting' },
  { value: 'on_hold', label: 'On hold' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
]

export function EditableStatusPill({
  value,
  onChange,
  disabled,
  ariaLabel,
  className = '',
}: {
  value: TicketStatus
  onChange: (status: TicketStatus) => void
  disabled?: boolean
  ariaLabel?: string
  className?: string
}) {
  return (
    <div className={`pill-select pill-select--status ${className}`} data-editable="true">
      <StatusPill status={value} />
      <select
        className="pill-select-input"
        value={value}
        disabled={disabled}
        aria-label={ariaLabel ?? 'Change status'}
        onChange={e => onChange(e.target.value as TicketStatus)}
        onClick={e => e.stopPropagation()}
      >
        {statuses.map(s => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
    </div>
  )
}
