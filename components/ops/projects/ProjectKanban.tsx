'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, GripVertical } from 'lucide-react'
import { updateTask } from '@/app/actions/projects'
import { TaskPrioritySelect, TaskStatusSelect } from '@/components/ops/projects/StatusSelect'
import {
  EditableAssigneeSelect,
  type AssigneeOption,
} from '@/components/tickets/EditableAssigneeSelect'
import { phaseToneIndexFromPhaseId, phaseToneLabelClass } from '@/lib/ops/projects/phase-tone'
import {
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  type OpsProjectDetail,
  type OpsProjectPhase,
  type OpsProjectTask,
  type TaskPriority,
  type TaskStatus,
} from '@/lib/ops/projects/types'
import { runWithToast } from '@/lib/notify'

const TASK_DRAG_TYPE = 'application/x-ops-task-id'

function KanbanCard({
  task,
  phases,
  staff,
  onOpenTask,
  onStatusChange,
  onAssigneeChange,
  onPriorityChange,
  pending,
  isDragging,
  onDragStart,
  onDragEnd,
}: {
  task: OpsProjectTask
  phases: OpsProjectPhase[]
  staff: AssigneeOption[]
  onOpenTask: (taskId: string) => void
  onStatusChange: (taskId: string, status: TaskStatus) => void
  onAssigneeChange: (taskId: string, assigneeId: string | null) => void
  onPriorityChange: (taskId: string, priority: TaskPriority) => void
  pending: boolean
  isDragging: boolean
  onDragStart: (taskId: string) => void
  onDragEnd: () => void
}) {
  const [subtasksOpen, setSubtasksOpen] = useState(false)
  const doneSubtasks = task.subtasks.filter(s => s.status === 'done').length
  const subtaskCount = task.subtasks.length

  return (
    <div
      className={`ops-kanban-card ops-kanban-card--${task.status}${task.priority === 'high' ? ' ops-kanban-card--priority-high' : ''}${isDragging ? ' ops-kanban-card--dragging' : ''}`}
      draggable={!pending}
      onDragStart={e => {
        const target = e.target as HTMLElement
        if (target.closest('select, button, input, textarea, a')) {
          e.preventDefault()
          return
        }
        e.dataTransfer.setData(TASK_DRAG_TYPE, task.id)
        e.dataTransfer.setData('text/plain', task.id)
        e.dataTransfer.effectAllowed = 'move'
        onDragStart(task.id)
      }}
      onDragEnd={onDragEnd}
    >
      <div className="ops-kanban-card-top">
        <span className="ops-kanban-drag-handle" aria-hidden>
          <GripVertical size={14} />
        </span>
        <button
          type="button"
          className="ops-kanban-card-title"
          onClick={() => onOpenTask(task.id)}
        >
          {task.title}
        </button>
      </div>
      {task.phaseName ? (
        <span
          className={`ops-kanban-phase-chip ${phaseToneLabelClass(phaseToneIndexFromPhaseId(task.phaseId, phases))}`}
        >
          {task.phaseName}
        </span>
      ) : null}
      {staff.length > 0 ? (
        <EditableAssigneeSelect
          value={task.assigneeId}
          options={staff}
          disabled={pending}
          className="ops-task-assignee"
          ariaLabel={`Assignee for ${task.title}`}
          onChange={assigneeId => onAssigneeChange(task.id, assigneeId)}
        />
      ) : null}
      {subtaskCount > 0 ? (
        <div
          className={`ops-kanban-subtasks-wrap${subtasksOpen ? '' : ' ops-kanban-subtasks-wrap--collapsed'}`}
        >
          <button
            type="button"
            className="ops-subtasks-toggle"
            onClick={e => {
              e.stopPropagation()
              setSubtasksOpen(v => !v)
            }}
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
            <>
              <div className="ops-kanban-subtasks-progress">
                <div
                  className="ops-kanban-subtasks-progress-fill"
                  style={{ width: `${(doneSubtasks / subtaskCount) * 100}%` }}
                />
              </div>
              <ul className="ops-kanban-subtasks">
                {task.subtasks.map(sub => (
                  <li key={sub.id} className={`ops-kanban-subtask ops-kanban-subtask--${sub.status}`}>
                    <span className={`ops-kanban-subtask-dot ops-kanban-subtask-dot--${sub.status}`} />
                    {sub.title}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      ) : null}
      <div className="ops-kanban-card-controls">
        <TaskPrioritySelect
          value={task.priority}
          disabled={pending}
          className="ops-kanban-priority-select"
          aria-label={`Priority for ${task.title}`}
          onChange={priority => onPriorityChange(task.id, priority)}
        />
        <TaskStatusSelect
          value={task.status}
          disabled={pending}
          className="ops-kanban-status-select"
          aria-label={`Status for ${task.title}`}
          onChange={status => onStatusChange(task.id, status)}
        />
      </div>
    </div>
  )
}

export function ProjectKanban({
  project,
  staff,
  onOpenTask,
}: {
  project: OpsProjectDetail
  staff: AssigneeOption[]
  onOpenTask: (taskId: string) => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [tasks, setTasks] = useState(project.tasks)
  const [syncedAt, setSyncedAt] = useState(project.updatedAt)
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<TaskStatus | null>(null)

  if (project.updatedAt !== syncedAt) {
    setSyncedAt(project.updatedAt)
    setTasks(project.tasks)
  }

  function patchTask(
    taskId: string,
    patch: Partial<Pick<OpsProjectTask, 'status' | 'assigneeId' | 'assigneeName' | 'priority'>>
  ) {
    setTasks(current => current.map(t => (t.id === taskId ? { ...t, ...patch } : t)))
  }

  function persistStatusChange(taskId: string, status: TaskStatus) {
    const previous = tasks
    patchTask(taskId, { status })

    startTransition(async () => {
      const ok = await runWithToast(() => updateTask(taskId, { status }), {
        loading: 'Moving task…',
        success: 'Task moved',
      })
      if (ok === null) {
        setTasks(previous)
        return
      }
      router.refresh()
    })
  }

  function persistPriorityChange(taskId: string, priority: TaskPriority) {
    const previous = tasks
    patchTask(taskId, { priority })

    startTransition(async () => {
      const ok = await runWithToast(() => updateTask(taskId, { priority }), {
        loading: 'Updating priority…',
        success: 'Priority updated',
      })
      if (ok === null) {
        setTasks(previous)
        return
      }
      router.refresh()
    })
  }

  function persistAssigneeChange(taskId: string, assigneeId: string | null) {
    const previous = tasks
    const assigneeName = assigneeId ? staff.find(s => s.id === assigneeId)?.name ?? null : null
    patchTask(taskId, { assigneeId, assigneeName })

    startTransition(async () => {
      const ok = await runWithToast(() => updateTask(taskId, { assigneeId }), {
        loading: 'Updating assignee…',
        success: assigneeId
          ? `Assigned to ${assigneeName ?? 'teammate'}`
          : 'Assignee cleared',
      })
      if (ok === null) {
        setTasks(previous)
        return
      }
      router.refresh()
    })
  }

  function readDraggedTaskId(e: React.DragEvent) {
    return e.dataTransfer.getData(TASK_DRAG_TYPE) || e.dataTransfer.getData('text/plain')
  }

  return (
    <div className="ops-kanban">
      {TASK_STATUSES.map(status => {
        const columnTasks = tasks.filter(t => t.status === status)
        const isDropTarget = dropTarget === status && draggedTaskId !== null

        return (
          <div
            key={status}
            className={`ops-kanban-column ops-kanban-column--${status}${isDropTarget ? ' ops-kanban-column--drop-target' : ''}`}
          >
            <div className={`ops-kanban-column-head ops-kanban-column-head--${status}`}>
              <span className="ops-kanban-column-label">{TASK_STATUS_LABELS[status]}</span>
              <span className={`ops-kanban-count ops-kanban-count--${status}`}>
                {columnTasks.length}
              </span>
            </div>
            <div
              className={`ops-kanban-column-body${isDropTarget ? ' ops-kanban-column-body--drop-target' : ''}`}
              onDragOver={e => {
                e.preventDefault()
                e.dataTransfer.dropEffect = 'move'
                if (draggedTaskId) setDropTarget(status)
              }}
              onDragEnter={e => {
                e.preventDefault()
                if (draggedTaskId) setDropTarget(status)
              }}
              onDragLeave={e => {
                const related = e.relatedTarget as Node | null
                if (related && e.currentTarget.contains(related)) return
                setDropTarget(current => (current === status ? null : current))
              }}
              onDrop={e => {
                e.preventDefault()
                const taskId = readDraggedTaskId(e)
                setDraggedTaskId(null)
                setDropTarget(null)
                if (!taskId) return

                const task = tasks.find(t => t.id === taskId)
                if (!task || task.status === status) return
                persistStatusChange(taskId, status)
              }}
            >
              {columnTasks.length === 0 ? (
                <p className={`ops-kanban-column-empty${isDropTarget ? ' ops-kanban-column-empty--active' : ''}`}>
                  {isDropTarget ? 'Drop here' : 'No tasks'}
                </p>
              ) : (
                columnTasks.map(task => (
                  <KanbanCard
                    key={task.id}
                    task={task}
                    phases={project.phases}
                    staff={staff}
                    onOpenTask={onOpenTask}
                    onStatusChange={persistStatusChange}
                    onAssigneeChange={persistAssigneeChange}
                    onPriorityChange={persistPriorityChange}
                    pending={pending}
                    isDragging={draggedTaskId === task.id}
                    onDragStart={setDraggedTaskId}
                    onDragEnd={() => {
                      setDraggedTaskId(null)
                      setDropTarget(null)
                    }}
                  />
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
