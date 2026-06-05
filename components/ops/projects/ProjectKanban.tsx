'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { GripVertical } from 'lucide-react'
import { updateTask } from '@/app/actions/projects'
import { PriorityBadge, TaskStatusSelect } from '@/components/ops/projects/StatusSelect'
import {
  EditableAssigneeSelect,
  type AssigneeOption,
} from '@/components/tickets/EditableAssigneeSelect'
import {
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  type OpsProjectDetail,
  type OpsProjectTask,
  type TaskStatus,
} from '@/lib/ops/projects/types'
import { runWithToast } from '@/lib/notify'

const TASK_DRAG_TYPE = 'application/x-ops-task-id'

function KanbanCard({
  task,
  staff,
  onStatusChange,
  onAssigneeChange,
  pending,
  isDragging,
  onDragStart,
  onDragEnd,
}: {
  task: OpsProjectTask
  staff: AssigneeOption[]
  onStatusChange: (taskId: string, status: TaskStatus) => void
  onAssigneeChange: (taskId: string, assigneeId: string | null) => void
  pending: boolean
  isDragging: boolean
  onDragStart: (taskId: string) => void
  onDragEnd: () => void
}) {
  const doneSubtasks = task.subtasks.filter(s => s.status === 'done').length

  return (
    <div
      className={`ops-kanban-card ops-kanban-card--${task.status}${isDragging ? ' ops-kanban-card--dragging' : ''}`}
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
        <p className="ops-kanban-card-title">{task.title}</p>
        <PriorityBadge priority={task.priority} />
      </div>
      {task.phaseName ? (
        <span className="ops-kanban-phase-chip">{task.phaseName}</span>
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
      {task.subtasks.length > 0 ? (
        <div className="ops-kanban-subtasks-wrap">
          <div className="ops-kanban-subtasks-progress">
            <div
              className="ops-kanban-subtasks-progress-fill"
              style={{ width: `${(doneSubtasks / task.subtasks.length) * 100}%` }}
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
        </div>
      ) : null}
      <TaskStatusSelect
        value={task.status}
        disabled={pending}
        className="ops-kanban-status-select"
        aria-label={`Status for ${task.title}`}
        onChange={status => onStatusChange(task.id, status)}
      />
    </div>
  )
}

export function ProjectKanban({
  project,
  staff,
}: {
  project: OpsProjectDetail
  staff: AssigneeOption[]
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

  function patchTask(taskId: string, patch: Partial<Pick<OpsProjectTask, 'status' | 'assigneeId' | 'assigneeName'>>) {
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
          <div key={status} className={`ops-kanban-column ops-kanban-column--${status}`}>
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
                    staff={staff}
                    onStatusChange={persistStatusChange}
                    onAssigneeChange={persistAssigneeChange}
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
