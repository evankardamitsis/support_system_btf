'use client'

import { useState, useTransition } from 'react'
import { createPhase, createTask, updatePhaseStatus, updateTask } from '@/app/actions/projects'
import { PhaseStatusSelect, PriorityBadge, TaskStatusSelect } from '@/components/ops/projects/StatusSelect'
import type {
  OpsProjectDetail,
  OpsProjectPhase,
  OpsProjectTask,
  PhaseStatus,
  TaskStatus,
} from '@/lib/ops/projects/types'
import { runWithToast } from '@/lib/notify'

type StaffOption = { id: string; name: string }

function TaskRow({
  task,
  phases,
  staff,
  depth,
  pending,
  onRefresh,
}: {
  task: OpsProjectTask
  phases: OpsProjectPhase[]
  staff: StaffOption[]
  depth: number
  pending: boolean
  onRefresh: () => void
}) {
  const [addingSubtask, setAddingSubtask] = useState(false)
  const [subtaskTitle, setSubtaskTitle] = useState('')

  function handleStatusChange(status: TaskStatus) {
    runWithToast(() => updateTask(task.id, { status }), {
      loading: 'Updating…',
      success: 'Task updated',
    }).then(() => onRefresh())
  }

  function handleAddSubtask(e: React.FormEvent) {
    e.preventDefault()
    if (!subtaskTitle.trim()) return
    runWithToast(
      () =>
        createTask({
          projectId: task.projectId,
          phaseId: task.phaseId,
          parentId: task.id,
          title: subtaskTitle,
        }),
      { loading: 'Adding subtask…', success: 'Subtask added' }
    ).then(() => {
      setSubtaskTitle('')
      setAddingSubtask(false)
      onRefresh()
    })
  }

  return (
    <div
      className={`ops-list-task ops-list-task--${task.status}${depth > 0 ? ' ops-list-task--subtask' : ''}`}
      style={{ paddingLeft: `${depth * 1.25}rem` }}
    >
      <div className={`ops-list-task-row ops-list-task-row--${task.status}`}>
        <span className={`ops-list-status-stripe ops-list-status-stripe--${task.status}`} aria-hidden />
        <span className="ops-list-task-title">{task.title}</span>
        <PriorityBadge priority={task.priority} />
        <TaskStatusSelect
          value={task.status}
          disabled={pending}
          className="ops-list-select"
          aria-label={`Status for ${task.title}`}
          onChange={handleStatusChange}
        />
        {task.assigneeName ? (
          <span className="ops-list-assignee">{task.assigneeName}</span>
        ) : null}
        {depth === 0 ? (
          <button
            type="button"
            className="ops-list-add-subtask"
            onClick={() => setAddingSubtask(v => !v)}
            disabled={pending}
          >
            + Subtask
          </button>
        ) : null}
      </div>
      {addingSubtask ? (
        <form onSubmit={handleAddSubtask} className="ops-list-inline-form">
          <input
            className="btf-input"
            value={subtaskTitle}
            onChange={e => setSubtaskTitle(e.target.value)}
            placeholder="Subtask title"
            disabled={pending}
            autoFocus
          />
          <button type="submit" className="dash-btn-primary btn-primary" disabled={pending}>
            Add
          </button>
        </form>
      ) : null}
      {task.subtasks.map(sub => (
        <TaskRow
          key={sub.id}
          task={sub}
          phases={phases}
          staff={staff}
          depth={depth + 1}
          pending={pending}
          onRefresh={onRefresh}
        />
      ))}
    </div>
  )
}

export function ProjectListView({
  project,
  staff,
  onRefresh,
}: {
  project: OpsProjectDetail
  staff: StaffOption[]
  onRefresh: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [newPhaseName, setNewPhaseName] = useState('')
  const [addingPhase, setAddingPhase] = useState(false)
  const [newTaskPhaseId, setNewTaskPhaseId] = useState<string>('')
  const [newTaskTitle, setNewTaskTitle] = useState('')

  const tasksByPhase = new Map<string | null, OpsProjectTask[]>()
  for (const task of project.tasks) {
    const key = task.phaseId
    if (!tasksByPhase.has(key)) tasksByPhase.set(key, [])
    tasksByPhase.get(key)!.push(task)
  }

  function handlePhaseStatus(phaseId: string, status: PhaseStatus) {
    startTransition(async () => {
      await runWithToast(() => updatePhaseStatus(phaseId, status), {
        loading: 'Updating phase…',
        success: 'Phase updated',
      })
      onRefresh()
    })
  }

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
            title: newTaskTitle,
          }),
        { loading: 'Adding task…', success: 'Task added' }
      )
      setNewTaskTitle('')
      onRefresh()
    })
  }

  const unphased = tasksByPhase.get(null) ?? []

  return (
    <div className="ops-list-view space-y-6">
      {project.phases.map(phase => {
        const phaseTasks = tasksByPhase.get(phase.id) ?? []
        const doneCount = phaseTasks.filter(t => t.status === 'done').length
        const phasePct = phaseTasks.length > 0 ? (doneCount / phaseTasks.length) * 100 : 0
        return (
          <section key={phase.id} className={`ops-list-phase ops-list-phase--${phase.status}`}>
            <div className={`ops-list-phase-head ops-list-phase-head--${phase.status}`}>
              <span className={`ops-list-phase-stripe ops-list-phase-stripe--${phase.status}`} aria-hidden />
              <h3 className="ops-list-phase-title">{phase.name}</h3>
              <PhaseStatusSelect
                value={phase.status}
                disabled={pending}
                className="ops-list-select"
                aria-label={`Status for phase ${phase.name}`}
                onChange={status => handlePhaseStatus(phase.id, status)}
              />
              <div className="ops-list-phase-progress">
                <div className="ops-list-phase-progress-bar">
                  <div
                    className="ops-list-phase-progress-fill"
                    style={{ width: `${phasePct}%` }}
                  />
                </div>
                <span className="ops-list-phase-progress-label">
                  {doneCount}/{phaseTasks.length}
                </span>
              </div>
            </div>
            {phaseTasks.length === 0 ? (
              <p className="dash-meta px-4 py-2">No tasks in this phase</p>
            ) : (
              phaseTasks.map(task => (
                <TaskRow
                  key={task.id}
                  task={task}
                  phases={project.phases}
                  staff={staff}
                  depth={0}
                  pending={pending}
                  onRefresh={onRefresh}
                />
              ))
            )}
          </section>
        )
      })}

      {unphased.length > 0 ? (
        <section className="ops-list-phase">
          <div className="ops-list-phase-head">
            <h3 className="ops-list-phase-title">Unassigned</h3>
          </div>
          {unphased.map(task => (
            <TaskRow
              key={task.id}
              task={task}
              phases={project.phases}
              staff={staff}
              depth={0}
              pending={pending}
              onRefresh={onRefresh}
            />
          ))}
        </section>
      ) : null}

      <div className="ops-list-actions space-y-4">
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
          <button type="submit" className="dash-btn-primary btn-primary" disabled={pending}>
            Add task
          </button>
        </form>
      </div>
    </div>
  )
}
