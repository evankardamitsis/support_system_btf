import { TASK_STATUSES, type TaskStatus } from '@/lib/ops/projects/types'

export function nextTaskStatus(current: TaskStatus): TaskStatus {
  const index = TASK_STATUSES.indexOf(current)
  if (index < 0) return TASK_STATUSES[0]
  return TASK_STATUSES[(index + 1) % TASK_STATUSES.length]
}
