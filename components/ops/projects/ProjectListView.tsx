'use client'

import { useRef, useState, useTransition } from 'react'
import { ChevronDown, Pencil, Trash2 } from 'lucide-react'
import {
  createTask,
  deletePhase,
  deleteTask,
  updatePhase,
  updatePhaseStatus,
  updateTask,
} from '@/app/actions/projects'
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal'
import {
  PhaseStatusSelect,
  TaskPrioritySelect,
  TaskStatusSelect,
} from '@/components/ops/projects/StatusSelect'
import {
  EditableAssigneeSelect,
  type AssigneeOption,
} from '@/components/tickets/EditableAssigneeSelect'
import { PHASE_TONE_COUNT } from '@/lib/ops/projects/phase-tone'
import type {
  OpsProjectDetail,
  OpsProjectPhase,
  OpsProjectTask,
  PhaseStatus,
  TaskPriority,
  TaskStatus,
} from '@/lib/ops/projects/types'
import { runWithToast } from '@/lib/notify'

type StaffOption = AssigneeOption

function PhaseSection({
  phaseId,
  title,
  toneIndex,
  status,
  taskCount,
  doneCount,
  collapsed,
  onToggle,
  onStatusChange,
  onRename,
  onDelete,
  pending,
  children,
}: {
  phaseId: string
  title: string
  toneIndex: number
  status?: PhaseStatus
  taskCount: number
  doneCount: number
  collapsed: boolean
  onToggle: (phaseId: string) => void
  onStatusChange?: (status: PhaseStatus) => void
  onRename?: (name: string) => void
  onDelete?: () => void
  pending: boolean
  children: React.ReactNode
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(title)
  const inputRef = useRef<HTMLInputElement>(null)
  const phasePct = taskCount > 0 ? (doneCount / taskCount) * 100 : 0
  const toneClass = `ops-list-phase--tone-${toneIndex % PHASE_TONE_COUNT}`
  const canManage = Boolean(onRename && onDelete)

  function startEditing() {
    if (!onRename || pending) return
    setDraft(title)
    setEditing(true)
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  function commitRename() {
    if (!onRename) return
    const trimmed = draft.trim()
    if (!trimmed) {
      setDraft(title)
      setEditing(false)
      return
    }
    if (trimmed !== title) onRename(trimmed)
    setEditing(false)
  }

  return (
    <section
      className={`ops-list-phase ${toneClass}${collapsed ? ' ops-list-phase--collapsed' : ''}`}
    >
      <div className="ops-list-phase-head">
        <div className="ops-list-phase-toggle-wrap">
          <button
            type="button"
            className="ops-list-phase-toggle"
            onClick={() => onToggle(phaseId)}
            aria-expanded={!collapsed}
            aria-controls={`ops-phase-body-${phaseId}`}
          >
            <ChevronDown
              size={16}
              className={`ops-list-phase-chevron${collapsed ? ' ops-list-phase-chevron--collapsed' : ''}`}
              aria-hidden
            />
            {editing ? (
              <input
                ref={inputRef}
                className="btf-input ops-list-phase-title-input"
                value={draft}
                disabled={pending}
                onChange={e => setDraft(e.target.value)}
                onBlur={commitRename}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    commitRename()
                  }
                  if (e.key === 'Escape') {
                    setDraft(title)
                    setEditing(false)
                  }
                }}
                onClick={e => e.stopPropagation()}
                aria-label="Phase name"
              />
            ) : (
              <span className="ops-list-phase-title">{title}</span>
            )}
            <span className="ops-list-phase-count">{taskCount}</span>
          </button>
          {canManage && !editing ? (
            <div className="ops-list-phase-manage">
              <button
                type="button"
                className="ops-list-phase-manage-btn"
                onClick={startEditing}
                disabled={pending}
                aria-label={`Rename phase ${title}`}
              >
                <Pencil size={14} aria-hidden />
              </button>
              {taskCount === 0 ? (
                <button
                  type="button"
                  className="ops-list-phase-manage-btn ops-list-phase-manage-btn--danger"
                  onClick={onDelete}
                  disabled={pending}
                  aria-label={`Delete phase ${title}`}
                >
                  <Trash2 size={14} aria-hidden />
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
        {status && onStatusChange ? (
          <PhaseStatusSelect
            value={status}
            disabled={pending}
            className="ops-list-select"
            aria-label={`Status for phase ${title}`}
            onChange={onStatusChange}
          />
        ) : null}
        <div className="ops-list-phase-progress">
          <div className="ops-list-phase-progress-bar">
            <div className="ops-list-phase-progress-fill" style={{ width: `${phasePct}%` }} />
          </div>
          <span className="ops-progress-copy ops-list-phase-progress-label">
            {doneCount}/{taskCount}
          </span>
        </div>
      </div>
      {!collapsed ? (
        <div id={`ops-phase-body-${phaseId}`} className="ops-list-phase-body">
          {taskCount > 0 ? (
            <div className="ops-list-col-head" aria-hidden>
              <span>Task</span>
              <span>Priority</span>
              <span>Status</span>
              <span>Assignee</span>
              <span />
            </div>
          ) : null}
          {children}
        </div>
      ) : null}
    </section>
  )
}

function TaskRow({
  task,
  phases,
  staff,
  depth,
  pending,
  onOpenTask,
  onDeleteRequest,
  onRefresh,
}: {
  task: OpsProjectTask
  phases: OpsProjectPhase[]
  staff: StaffOption[]
  depth: number
  pending: boolean
  onOpenTask: (taskId: string) => void
  onDeleteRequest: (task: OpsProjectTask) => void
  onRefresh: () => void
}) {
  const [addingSubtask, setAddingSubtask] = useState(false)
  const [subtaskTitle, setSubtaskTitle] = useState('')
  const [subtasksOpen, setSubtasksOpen] = useState(false)
  const subtaskCount = task.subtasks.length
  const doneSubtasks = task.subtasks.filter(s => s.status === 'done').length

  function handleStatusChange(status: TaskStatus) {
    runWithToast(() => updateTask(task.id, { status }), {
      loading: 'Updating…',
      success: 'Task updated',
    }).then(() => onRefresh())
  }

  function handleAssigneeChange(assigneeId: string | null) {
    runWithToast(() => updateTask(task.id, { assigneeId }), {
      loading: 'Updating assignee…',
      success: assigneeId
        ? `Assigned to ${staff.find(s => s.id === assigneeId)?.name ?? 'teammate'}`
        : 'Assignee cleared',
    }).then(() => onRefresh())
  }

  function handlePriorityChange(priority: TaskPriority) {
    runWithToast(() => updateTask(task.id, { priority }), {
      loading: 'Updating priority…',
      success: 'Priority updated',
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
    <div className={`ops-list-task-group${depth > 0 ? ' ops-list-task-group--nested' : ''}`}>
      <div
        className={`ops-list-task ops-list-task--${task.status}${task.priority === 'high' ? ' ops-list-task--priority-high' : ''}`}
      >
        <div className={`ops-list-task-grid ops-list-task-grid--${task.status}`}>
          <div className="ops-list-task-main" data-label="Task">
            <button
              type="button"
              className="ops-list-task-title"
              onClick={() => onOpenTask(task.id)}
            >
              {task.title}
            </button>
          </div>
          <div className="ops-list-task-priority" data-label="Priority">
            <TaskPrioritySelect
              value={task.priority}
              disabled={pending}
              className="ops-list-select"
              aria-label={`Priority for ${task.title}`}
              onChange={handlePriorityChange}
            />
          </div>
          <div className="ops-list-task-status" data-label="Status">
            <TaskStatusSelect
              value={task.status}
              disabled={pending}
              className="ops-list-select"
              aria-label={`Status for ${task.title}`}
              onChange={handleStatusChange}
            />
          </div>
          <div className="ops-list-task-assignee" data-label="Assignee">
            {staff.length > 0 ? (
              <EditableAssigneeSelect
                value={task.assigneeId}
                options={staff}
                disabled={pending}
                className="ops-task-assignee"
                ariaLabel={`Assignee for ${task.title}`}
                onChange={handleAssigneeChange}
              />
            ) : (
              <span className="ops-list-task-empty">—</span>
            )}
          </div>
          <div className="ops-list-task-actions">
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
            <button
              type="button"
              className="ops-list-task-delete"
              onClick={() => onDeleteRequest(task)}
              disabled={pending}
              aria-label={`Delete ${task.title}`}
            >
              <Trash2 size={14} aria-hidden />
            </button>
          </div>
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
      </div>
      {subtaskCount > 0 ? (
        <div
          className={`ops-list-subtasks-wrap${subtasksOpen ? '' : ' ops-list-subtasks-wrap--collapsed'}`}
        >
          <button
            type="button"
            className="ops-subtasks-toggle ops-subtasks-toggle--list"
            onClick={() => setSubtasksOpen(v => !v)}
            aria-expanded={subtasksOpen}
            aria-label={subtasksOpen ? 'Collapse subtasks' : `Show ${subtaskCount} subtasks`}
          >
            <ChevronDown
              size={14}
              className={`ops-subtasks-toggle-chevron${subtasksOpen ? '' : ' ops-subtasks-toggle-chevron--collapsed'}`}
              aria-hidden
            />
            <span className="ops-subtasks-toggle-label">
              {subtasksOpen
                ? 'Subtasks'
                : `${subtaskCount} subtask${subtaskCount === 1 ? '' : 's'}`}
            </span>
            {!subtasksOpen ? (
              <span className="ops-subtasks-toggle-meta">
                {doneSubtasks}/{subtaskCount} done
              </span>
            ) : null}
          </button>
          {subtasksOpen ? (
            <div className="ops-list-subtasks">
              {task.subtasks.map(sub => (
                <TaskRow
                  key={sub.id}
                  task={sub}
                  phases={phases}
                  staff={staff}
                  depth={depth + 1}
                  pending={pending}
                  onOpenTask={onOpenTask}
                  onDeleteRequest={onDeleteRequest}
                  onRefresh={onRefresh}
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function groupTasksByPhase(tasks: OpsProjectTask[]) {
  const tasksByPhase = new Map<string | null, OpsProjectTask[]>()
  for (const task of tasks) {
    const key = task.phaseId
    if (!tasksByPhase.has(key)) tasksByPhase.set(key, [])
    tasksByPhase.get(key)!.push(task)
  }
  return tasksByPhase
}

export function ProjectListView({
  project,
  visibleTasks,
  staff,
  hideEmptyPhases = false,
  onOpenTask,
  onRefresh,
}: {
  project: OpsProjectDetail
  visibleTasks?: OpsProjectTask[]
  staff: StaffOption[]
  hideEmptyPhases?: boolean
  onOpenTask: (taskId: string) => void
  onRefresh: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [collapsedPhases, setCollapsedPhases] = useState<Set<string>>(() => new Set())
  const [phaseToDelete, setPhaseToDelete] = useState<{ id: string; name: string } | null>(null)
  const [taskToDelete, setTaskToDelete] = useState<OpsProjectTask | null>(null)

  function togglePhase(phaseId: string) {
    setCollapsedPhases(prev => {
      const next = new Set(prev)
      if (next.has(phaseId)) next.delete(phaseId)
      else next.add(phaseId)
      return next
    })
  }

  const progressByPhase = groupTasksByPhase(project.tasks)
  const displayByPhase = groupTasksByPhase(visibleTasks ?? project.tasks)

  function handlePhaseStatus(phaseId: string, status: PhaseStatus) {
    startTransition(async () => {
      await runWithToast(() => updatePhaseStatus(phaseId, status), {
        loading: 'Updating phase…',
        success: 'Phase updated',
      })
      onRefresh()
    })
  }

  function handlePhaseRename(phaseId: string, name: string) {
    startTransition(async () => {
      await runWithToast(() => updatePhase(phaseId, name), {
        loading: 'Renaming phase…',
        success: 'Phase renamed',
      })
      onRefresh()
    })
  }

  function handlePhaseDelete() {
    if (!phaseToDelete) return
    startTransition(async () => {
      const ok = await runWithToast(() => deletePhase(phaseToDelete.id), {
        loading: 'Deleting phase…',
        success: 'Phase deleted',
      })
      if (ok === null) return
      setPhaseToDelete(null)
      onRefresh()
    })
  }

  function handleTaskDelete() {
    if (!taskToDelete) return
    startTransition(async () => {
      const ok = await runWithToast(() => deleteTask(taskToDelete.id), {
        loading: 'Deleting task…',
        success: 'Task deleted',
      })
      if (ok === null) return
      setTaskToDelete(null)
      onRefresh()
    })
  }

  const unphasedDisplay = displayByPhase.get(null) ?? []
  const unphasedProgress = progressByPhase.get(null) ?? []

  return (
    <div className="ops-list-view">
      {project.phases.map((phase, index) => {
        const phaseTasks = displayByPhase.get(phase.id) ?? []
        const progressTasks = progressByPhase.get(phase.id) ?? []
        if (hideEmptyPhases && phaseTasks.length === 0) return null
        const doneCount = progressTasks.filter(t => t.status === 'done').length
        return (
          <PhaseSection
            key={phase.id}
            phaseId={phase.id}
            title={phase.name}
            toneIndex={index}
            status={phase.status}
            taskCount={progressTasks.length}
            doneCount={doneCount}
            collapsed={collapsedPhases.has(phase.id)}
            onToggle={togglePhase}
            onStatusChange={status => handlePhaseStatus(phase.id, status)}
            onRename={name => handlePhaseRename(phase.id, name)}
            onDelete={() => setPhaseToDelete({ id: phase.id, name: phase.name })}
            pending={pending}
          >
            {phaseTasks.length === 0 ? (
              progressTasks.length === 0 ? (
                <p className="ops-list-empty">No tasks in this phase</p>
              ) : null
            ) : (
              phaseTasks.map(task => (
                <TaskRow
                  key={task.id}
                  task={task}
                  phases={project.phases}
                  staff={staff}
                  depth={0}
                  pending={pending}
                  onOpenTask={onOpenTask}
                  onDeleteRequest={setTaskToDelete}
                  onRefresh={onRefresh}
                />
              ))
            )}
          </PhaseSection>
        )
      })}

      {unphasedProgress.length > 0 || unphasedDisplay.length > 0 ? (
        <PhaseSection
          phaseId="__unassigned__"
          title="Unassigned"
          toneIndex={PHASE_TONE_COUNT}
          taskCount={unphasedProgress.length}
          doneCount={unphasedProgress.filter(t => t.status === 'done').length}
          collapsed={collapsedPhases.has('__unassigned__')}
          onToggle={togglePhase}
          pending={pending}
        >
          {unphasedDisplay.map(task => (
            <TaskRow
              key={task.id}
              task={task}
              phases={project.phases}
              staff={staff}
              depth={0}
              pending={pending}
              onOpenTask={onOpenTask}
              onDeleteRequest={setTaskToDelete}
              onRefresh={onRefresh}
            />
          ))}
        </PhaseSection>
      ) : null}

      <ConfirmDeleteModal
        open={Boolean(taskToDelete)}
        onClose={() => setTaskToDelete(null)}
        title="Delete task?"
        description={
          taskToDelete ? (
            <>
              This removes <strong>{taskToDelete.title}</strong>
              {taskToDelete.subtasks.length > 0
                ? ` and its ${taskToDelete.subtasks.length} subtask${taskToDelete.subtasks.length === 1 ? '' : 's'}`
                : ''}
              .
            </>
          ) : null
        }
        confirmLabel="Delete task"
        pending={pending}
        onConfirm={handleTaskDelete}
      />

      <ConfirmDeleteModal
        open={Boolean(phaseToDelete)}
        onClose={() => setPhaseToDelete(null)}
        title="Delete phase?"
        description={
          phaseToDelete ? (
            <>
              This permanently removes the <strong>{phaseToDelete.name}</strong> phase. Tasks must be
              moved or deleted first.
            </>
          ) : null
        }
        confirmLabel="Delete phase"
        pending={pending}
        onConfirm={handlePhaseDelete}
      />
    </div>
  )
}
