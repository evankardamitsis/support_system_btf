import type { OpsProjectTask } from './types'

export function findProjectTask(tasks: OpsProjectTask[], taskId: string): OpsProjectTask | null {
  for (const task of tasks) {
    if (task.id === taskId) return task
    const nested = findProjectTask(task.subtasks, taskId)
    if (nested) return nested
  }
  return null
}

export function findParentProjectTask(
  tasks: OpsProjectTask[],
  taskId: string
): OpsProjectTask | null {
  for (const task of tasks) {
    if (task.subtasks.some(sub => sub.id === taskId)) return task
    const nested = findParentProjectTask(task.subtasks, taskId)
    if (nested) return nested
  }
  return null
}

export function flattenProjectTasks(tasks: OpsProjectTask[]): OpsProjectTask[] {
  const flat: OpsProjectTask[] = []
  for (const task of tasks) {
    flat.push(task)
    flat.push(...flattenProjectTasks(task.subtasks))
  }
  return flat
}
