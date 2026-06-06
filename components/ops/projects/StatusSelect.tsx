import {
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  type PhaseStatus,
  type TaskPriority,
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

export function TaskPrioritySelect({
  value,
  onChange,
  disabled,
  className = '',
  'aria-label': ariaLabel,
}: {
  value: TaskPriority
  onChange: (priority: TaskPriority) => void
  disabled?: boolean
  className?: string
  'aria-label'?: string
}) {
  return (
    <select
      className={`btf-input ops-priority-select ops-priority-select--${value} ${className}`.trim()}
      value={value}
      disabled={disabled}
      aria-label={ariaLabel}
      onChange={e => onChange(e.target.value as TaskPriority)}
    >
      {TASK_PRIORITIES.map(p => (
        <option key={p} value={p}>
          {TASK_PRIORITY_LABELS[p]}
        </option>
      ))}
    </select>
  )
}

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  if (priority === 'normal') return null
  return (
    <span className={`ops-priority-badge ops-priority-badge--${priority}`}>
      {TASK_PRIORITY_LABELS[priority]}
    </span>
  )
}
