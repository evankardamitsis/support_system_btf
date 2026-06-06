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

export function filterProjectTasks(
  tasks: OpsProjectTask[],
  filter: AssigneeFilter
): OpsProjectTask[] {
  if (filter === 'all') return tasks
  return tasks
    .map(task => filterTaskTree(task, filter))
    .filter((task): task is OpsProjectTask => task !== null)
}
