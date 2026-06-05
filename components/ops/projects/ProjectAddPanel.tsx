'use client'

import { useState, useTransition } from 'react'
import { createPhase, createTask } from '@/app/actions/projects'
import type { AssigneeOption } from '@/components/tickets/EditableAssigneeSelect'
import type { OpsProjectDetail } from '@/lib/ops/projects/types'
import { runWithToast } from '@/lib/notify'

export function ProjectAddPanel({
  project,
  staff,
  onRefresh,
}: {
  project: OpsProjectDetail
  staff: AssigneeOption[]
  onRefresh: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [newPhaseName, setNewPhaseName] = useState('')
  const [addingPhase, setAddingPhase] = useState(false)
  const [newTaskPhaseId, setNewTaskPhaseId] = useState('')
  const [newTaskAssigneeId, setNewTaskAssigneeId] = useState('')
  const [newTaskTitle, setNewTaskTitle] = useState('')

  function handleAddPhase(e: React.FormEvent) {
    e.preventDefault()
    if (!newPhaseName.trim()) return
    startTransition(async () => {
      await runWithToast(() => createPhase(project.id, newPhaseName), {
        loading: 'Adding phase…',
        success: 'Phase added',
      })
      setNewPhaseName('')
      setAddingPhase(false)
      onRefresh()
    })
  }

  function handleAddTask(e: React.FormEvent) {
    e.preventDefault()
    if (!newTaskTitle.trim()) return
    startTransition(async () => {
      await runWithToast(
        () =>
          createTask({
            projectId: project.id,
            phaseId: newTaskPhaseId || null,
            assigneeId: newTaskAssigneeId || null,
            title: newTaskTitle,
          }),
        { loading: 'Adding task…', success: 'Task added' }
      )
      setNewTaskTitle('')
      setNewTaskAssigneeId('')
      onRefresh()
    })
  }

  return (
    <div className="ops-project-add-panel space-y-4">
      {addingPhase ? (
        <form onSubmit={handleAddPhase} className="ops-list-inline-form">
          <input
            className="btf-input"
            value={newPhaseName}
            onChange={e => setNewPhaseName(e.target.value)}
            placeholder="Phase name"
            disabled={pending}
            autoFocus
          />
          <button type="submit" className="dash-btn-primary btn-primary" disabled={pending}>
            Add phase
          </button>
          <button
            type="button"
            className="dash-btn-ghost"
            onClick={() => setAddingPhase(false)}
            disabled={pending}
          >
            Cancel
          </button>
        </form>
      ) : (
        <button
          type="button"
          className="dash-btn-ghost"
          onClick={() => setAddingPhase(true)}
          disabled={pending}
        >
          + Add phase
        </button>
      )}

      <form onSubmit={handleAddTask} className="ops-list-inline-form">
        <select
          className="btf-input"
          value={newTaskPhaseId}
          onChange={e => setNewTaskPhaseId(e.target.value)}
          disabled={pending}
          aria-label="Phase for new task"
        >
          <option value="">No phase</option>
          {project.phases.map(p => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <input
          className="btf-input flex-1"
          value={newTaskTitle}
          onChange={e => setNewTaskTitle(e.target.value)}
          placeholder="New task title"
          disabled={pending}
        />
        {staff.length > 0 ? (
          <select
            className="btf-input"
            value={newTaskAssigneeId}
            onChange={e => setNewTaskAssigneeId(e.target.value)}
            disabled={pending}
            aria-label="Assignee for new task"
          >
            <option value="">Unassigned</option>
            {staff.map(s => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        ) : null}
        <button type="submit" className="dash-btn-primary btn-primary" disabled={pending}>
          Add task
        </button>
      </form>
    </div>
  )
}
