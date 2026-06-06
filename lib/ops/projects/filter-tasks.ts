import type { OpsProjectTask } from '@/lib/ops/projects/types'

export type AssigneeFilter = 'all' | 'unassigned' | string

function taskMatchesAssignee(task: OpsProjectTask, filter: AssigneeFilter): boolean {
  if (filter === 'all') return true
  if (filter === 'unassigned') return task.assigneeId === null
  return task.assigneeId === filter
}

function filterTaskTree(task: OpsProjectTask, filter: AssigneeFilter): OpsProjectTask | null {
  if (filter === 'all') return task

  const filteredSubtasks = task.subtasks
    .map(sub => filterTaskTree(sub, filter))
    .filter((sub): sub is OpsProjectTask => sub !== null)

  if (taskMatchesAssignee(task, filter) || filteredSubtasks.length > 0) {
    return { ...task, subtasks: filteredSubtasks }
  }

  return null
}

function hideCompletedTaskTree(task: OpsProjectTask): OpsProjectTask | null {
  if (task.status === 'done') return null

  const visibleSubtasks = task.subtasks
    .map(sub => hideCompletedTaskTree(sub))
    .filter((sub): sub is OpsProjectTask => sub !== null)

  return { ...task, subtasks: visibleSubtasks }
}

export function filterProjectTasks(
  tasks: OpsProjectTask[],
  filter: AssigneeFilter,
  hideCompleted = false
): OpsProjectTask[] {
  let result =
    filter === 'all'
      ? tasks
      : tasks
          .map(task => filterTaskTree(task, filter))
          .filter((task): task is OpsProjectTask => task !== null)

  if (!hideCompleted) return result

  return result
    .map(task => hideCompletedTaskTree(task))
    .filter((task): task is OpsProjectTask => task !== null)
}
