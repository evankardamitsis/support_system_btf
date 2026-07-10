import { isEmptyTicketDescription } from '@/lib/tickets/description-format'
import type { OpsProjectTask } from '@/lib/ops/projects/types'

export function taskHasDescription(task: Pick<OpsProjectTask, 'description'>): boolean {
  return !isEmptyTicketDescription(task.description)
}

export function taskHasNotes(task: Pick<OpsProjectTask, 'commentCount'>): boolean {
  return (task.commentCount ?? 0) > 0
}

export function taskHasContent(task: Pick<OpsProjectTask, 'description' | 'commentCount'>): boolean {
  return taskHasDescription(task) || taskHasNotes(task)
}
