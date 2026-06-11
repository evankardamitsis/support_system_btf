'use client'

export type AssigneeOption = { id: string; name: string }

function assigneeDisplayName(name: string, compact: boolean): string {
  if (!compact) return name
  const first = name.trim().split(/\s+/)[0]
  return first || name
}

export function EditableAssigneeSelect({
  value,
  options,
  onChange,
  disabled,
  ariaLabel,
  className = '',
  compact = false,
}: {
  value: string | null
  options: AssigneeOption[]
  onChange: (assigneeId: string | null) => void
  disabled?: boolean
  ariaLabel?: string
  className?: string
  /** First name only — for dense tables; full name stays in title + select options */
  compact?: boolean
}) {
  const fullName = value ? (options.find(o => o.id === value)?.name ?? 'Unknown') : 'Unassigned'
  const label = value ? assigneeDisplayName(fullName, compact) : 'Unassigned'

  return (
    <div className={`pill-select pill-select--assignee ${className}`} data-editable="true">
      <span className="assignee-pill-label" title={compact && value ? fullName : undefined}>
        {label}
      </span>
      <select
        className="pill-select-input"
        value={value ?? ''}
        disabled={disabled}
        aria-label={ariaLabel ?? 'Change assignee'}
        onChange={e => onChange(e.target.value === '' ? null : e.target.value)}
        onClick={e => e.stopPropagation()}
      >
        <option value="">Unassigned</option>
        {options.map(option => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
    </div>
  )
}

export function AssigneeLabel({
  value,
  options,
  className = '',
}: {
  value: string | null
  options: AssigneeOption[]
  className?: string
}) {
  const label = value ? (options.find(o => o.id === value)?.name ?? 'Unknown') : 'Unassigned'
  return <span className={`assignee-pill-label assignee-pill-label--readonly ${className}`}>{label}</span>
}
