import { TASK_STATUSES, type TaskStatus } from '@/lib/ops/projects/types'

export function nextTaskStatus(current: TaskStatus): TaskStatus {
  const index = TASK_STATUSES.indexOf(current)
  if (index < 0) return TASK_STATUSES[0]
  return TASK_STATUSES[(index + 1) % TASK_STATUSES.length]
}

export function resolveTaskStatusClick(
  current: TaskStatus,
  options: { markComplete?: boolean } = {}
): TaskStatus {
  if (options.markComplete && current !== 'done') return 'done'
  return nextTaskStatus(current)
}
