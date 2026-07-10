import { FileText, MessageSquare } from 'lucide-react'
import { taskHasDescription, taskHasNotes } from '@/lib/ops/projects/task-content'
import type { OpsProjectTask } from '@/lib/ops/projects/types'

export function TaskContentIndicators({
  task,
  className = '',
}: {
  task: Pick<OpsProjectTask, 'description' | 'commentCount'>
  className?: string
}) {
  const hasDescription = taskHasDescription(task)
  const hasNotes = taskHasNotes(task)

  if (!hasDescription && !hasNotes) return null

  return (
    <span className={`ops-task-content-indicators${className ? ` ${className}` : ''}`}>
      {hasDescription ? (
        <span className="ops-task-content-indicator" title="Has description" aria-label="Has description">
          <FileText size={12} aria-hidden />
        </span>
      ) : null}
      {hasNotes ? (
        <span
          className="ops-task-content-indicator"
          title={`${task.commentCount} note${task.commentCount === 1 ? '' : 's'}`}
          aria-label={`${task.commentCount} note${task.commentCount === 1 ? '' : 's'}`}
        >
          <MessageSquare size={12} aria-hidden />
        </span>
      ) : null}
    </span>
  )
}
