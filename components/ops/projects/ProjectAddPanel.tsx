'use client'

import { useEffect, useState, useTransition } from 'react'
import { useModalDialog } from '@/lib/ui/use-modal-dialog'
import { createTask } from '@/app/actions/projects'
import type { AssigneeOption } from '@/components/tickets/EditableAssigneeSelect'
import {
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  type OpsProjectDetail,
  type TaskPriority,
} from '@/lib/ops/projects/types'
import { runWithToast } from '@/lib/notify'

export function ProjectAddPanel({
  open,
  onClose,
  project,
  staff,
  onRefresh,
}: {
  open: boolean
  onClose: () => void
  project: OpsProjectDetail
  staff: AssigneeOption[]
  onRefresh: () => void
}) {
  const dialogRef = useModalDialog(open, onClose)
  const [pending, startTransition] = useTransition()
  const [newTaskPhaseId, setNewTaskPhaseId] = useState('')
  const [newTaskAssigneeId, setNewTaskAssigneeId] = useState('')
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>('normal')

  useEffect(() => {
    if (open) return
    setNewTaskPhaseId('')
    setNewTaskAssigneeId('')
    setNewTaskTitle('')
    setNewTaskPriority('normal')
  }, [open])

  function handleAddTask(e: React.FormEvent) {
    e.preventDefault()
    if (!newTaskTitle.trim()) return
    startTransition(async () => {
      const ok = await runWithToast(
        () =>
          createTask({
            projectId: project.id,
            phaseId: newTaskPhaseId || null,
            assigneeId: newTaskAssigneeId || null,
            priority: newTaskPriority,
            title: newTaskTitle,
          }),
        { loading: 'Adding task…', success: 'Task added' }
      )
      if (ok === null) return
      onClose()
      onRefresh()
    })
  }

  return (
    <dialog ref={dialogRef} className="ticket-modal ticket-modal--ops-form">
      {open ? (
        <div className="ticket-modal-inner">
          <h2 className="ticket-modal-title">Add task</h2>
          <p className="ticket-modal-sub">Create a task for {project.name}.</p>

          <form onSubmit={handleAddTask} className="ops-add-task-modal-form">
            <div>
              <label className="dash-label" htmlFor="ops-new-task-title">
                Title <span className="dash-label-required">*</span>
              </label>
              <input
                id="ops-new-task-title"
                className="btf-input w-full"
                value={newTaskTitle}
                onChange={e => setNewTaskTitle(e.target.value)}
                placeholder="Task title"
                disabled={pending}
                autoFocus
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="dash-label" htmlFor="ops-new-task-phase">
                  Phase
                </label>
                <select
                  id="ops-new-task-phase"
                  className="btf-input w-full"
                  value={newTaskPhaseId}
                  onChange={e => setNewTaskPhaseId(e.target.value)}
                  disabled={pending}
                >
                  <option value="">No phase</option>
                  {project.phases.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="dash-label" htmlFor="ops-new-task-priority">
                  Priority
                </label>
                <select
                  id="ops-new-task-priority"
                  className={`btf-input w-full ops-priority-select ops-priority-select--${newTaskPriority}`}
                  value={newTaskPriority}
                  onChange={e => setNewTaskPriority(e.target.value as TaskPriority)}
                  disabled={pending}
                >
                  {TASK_PRIORITIES.map(p => (
                    <option key={p} value={p}>
                      {TASK_PRIORITY_LABELS[p]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {staff.length > 0 ? (
              <div>
                <label className="dash-label" htmlFor="ops-new-task-assignee">
                  Assignee
                </label>
                <select
                  id="ops-new-task-assignee"
                  className="btf-input w-full"
                  value={newTaskAssigneeId}
                  onChange={e => setNewTaskAssigneeId(e.target.value)}
                  disabled={pending}
                >
                  <option value="">Unassigned</option>
                  {staff.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div className="ticket-modal-actions">
              <button
                type="button"
                className="dash-btn-secondary cursor-pointer"
                onClick={onClose}
                disabled={pending}
              >
                Cancel
              </button>
              <button type="submit" className="dash-btn-primary btn-primary" disabled={pending}>
                {pending ? 'Adding…' : 'Add task'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </dialog>
  )
}
