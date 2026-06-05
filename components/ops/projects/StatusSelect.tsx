import {
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  type PhaseStatus,
  type TaskStatus,
} from '@/lib/ops/projects/types'

const PHASE_STATUS_LABELS: Record<PhaseStatus, string> = {
  pending: 'Pending',
  in_progress: 'In progress',
  done: 'Done',
}

const PHASE_STATUSES: PhaseStatus[] = ['pending', 'in_progress', 'done']

export function TaskStatusSelect({
  value,
  onChange,
  disabled,
  className = '',
  'aria-label': ariaLabel,
}: {
  value: TaskStatus
  onChange: (status: TaskStatus) => void
  disabled?: boolean
  className?: string
  'aria-label'?: string
}) {
  return (
    <select
      className={`btf-input ops-status-select ops-status-select--task ops-status-select--${value} ${className}`.trim()}
      value={value}
      disabled={disabled}
      aria-label={ariaLabel}
      onChange={e => onChange(e.target.value as TaskStatus)}
    >
      {TASK_STATUSES.map(s => (
        <option key={s} value={s}>
          {TASK_STATUS_LABELS[s]}
        </option>
      ))}
    </select>
  )
}

export function PhaseStatusSelect({
  value,
  onChange,
  disabled,
  className = '',
  'aria-label': ariaLabel,
}: {
  value: PhaseStatus
  onChange: (status: PhaseStatus) => void
  disabled?: boolean
  className?: string
  'aria-label'?: string
}) {
  return (
    <select
      className={`btf-input ops-status-select ops-status-select--phase ops-status-select--${value} ${className}`.trim()}
      value={value}
      disabled={disabled}
      aria-label={ariaLabel}
      onChange={e => onChange(e.target.value as PhaseStatus)}
    >
      {PHASE_STATUSES.map(s => (
        <option key={s} value={s}>
          {PHASE_STATUS_LABELS[s]}
        </option>
      ))}
    </select>
  )
}

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span className={`ops-status-badge ops-status-badge--task ops-status-badge--${status}`}>
      {TASK_STATUS_LABELS[status]}
    </span>
  )
}

export function PriorityBadge({ priority }: { priority: 'low' | 'normal' | 'high' }) {
  if (priority === 'normal') return null
  return (
    <span className={`ops-priority-badge ops-priority-badge--${priority}`}>
      {priority === 'high' ? 'High' : 'Low'}
    </span>
  )
}
