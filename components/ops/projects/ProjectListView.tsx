'use client'

import { useMemo, useRef, useState, useTransition } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
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
  AgentPlan,
  type AgentPlanGroup,
  type AgentPlanItem,
} from '@/components/ui/agent-plan'
import { PhaseStatusSelect } from '@/components/ops/projects/StatusSelect'
import {
  EditableAssigneeSelect,
  type AssigneeOption,
} from '@/components/tickets/EditableAssigneeSelect'
import { formatProjectDate } from '@/lib/ops/projects/display'
import { PHASE_TONE_COUNT } from '@/lib/ops/projects/phase-tone'
import { resolveTaskStatusClick } from '@/lib/ops/projects/task-status'
import type {
  OpsProjectDetail,
  OpsProjectPhase,
  OpsProjectTask,
  PhaseStatus,
  TaskPriority,
  TaskStatus,
} from '@/lib/ops/projects/types'
import {
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
} from '@/lib/ops/projects/types'
import { runWithToast } from '@/lib/notify'

type StaffOption = AssigneeOption

const PHASE_STATUS_LABELS: Record<PhaseStatus, string> = {
  pending: 'Pending',
  in_progress: 'In progress',
  done: 'Done',
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

function itemExpandKey(groupId: string, itemId: string) {
  return `${groupId}:${itemId}`
}

function taskDueBadge(task: OpsProjectTask) {
  if (!task.dueDate) return undefined
  return [{ key: 'due', label: `Due ${formatProjectDate(task.dueDate)}`, tone: 'warn' as const }]
}

function taskRowTrailing(
  task: OpsProjectTask,
  staff: StaffOption[],
  pending: boolean,
  onAssignee: (taskId: string, assigneeId: string | null) => void,
  onPriority: (taskId: string, priority: TaskPriority) => void
) {
  return (
    <div className="ops-agent-plan-row-controls">
      {staff.length > 0 ? (
        <EditableAssigneeSelect
          value={task.assigneeId}
          options={staff}
          disabled={pending}
          className="ops-task-assignee ops-agent-plan-assignee"
          ariaLabel={`Assignee for ${task.title}`}
          onChange={assigneeId => onAssignee(task.id, assigneeId)}
        />
      ) : null}
      <select
        className="btf-input ops-priority-select ops-priority-select--compact ops-agent-plan-priority"
        value={task.priority}
        disabled={pending}
        aria-label={`Priority for ${task.title}`}
        onChange={e => onPriority(task.id, e.target.value as TaskPriority)}
      >
        {(['low', 'normal', 'high'] as const).map(priority => (
          <option key={priority} value={priority}>
            {TASK_PRIORITY_LABELS[priority]}
          </option>
        ))}
      </select>
    </div>
  )
}

function mapTaskToPlanItem(
  task: OpsProjectTask,
  staff: StaffOption[],
  pending: boolean,
  onDeleteRequest: (task: OpsProjectTask) => void,
  onAssignee: (taskId: string, assigneeId: string | null) => void,
  onPriority: (taskId: string, priority: TaskPriority) => void
): AgentPlanItem {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    statusLabel: TASK_STATUS_LABELS[task.status],
    badges: taskDueBadge(task),
    trailing: taskRowTrailing(task, staff, pending, onAssignee, onPriority),
    actions: (
      <button
        type="button"
        className="ops-agent-plan-action-btn ops-agent-plan-action-btn--danger"
        onClick={() => onDeleteRequest(task)}
        disabled={pending}
        aria-label={`Delete ${task.title}`}
      >
        <Trash2 size={13} aria-hidden />
      </button>
    ),
    children: task.subtasks.map(sub => ({
      id: sub.id,
      title: sub.title,
      description: sub.description,
      status: sub.status,
      statusLabel: TASK_STATUS_LABELS[sub.status],
      badges: taskDueBadge(sub),
      trailing: taskRowTrailing(sub, staff, pending, onAssignee, onPriority),
      actions: (
        <button
          type="button"
          className="ops-agent-plan-action-btn ops-agent-plan-action-btn--danger"
          onClick={() => onDeleteRequest(sub)}
          disabled={pending}
          aria-label={`Delete ${sub.title}`}
        >
          <Trash2 size={13} aria-hidden />
        </button>
      ),
    })),
  }
}

function PhaseTitleEditor({
  title,
  pending,
  onRename,
}: {
  title: string
  pending: boolean
  onRename: (name: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(title)
  const inputRef = useRef<HTMLInputElement>(null)

  function startEditing() {
    if (pending) return
    setDraft(title)
    setEditing(true)
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  function commitRename() {
    const trimmed = draft.trim()
    if (!trimmed) {
      setDraft(title)
      setEditing(false)
      return
    }
    if (trimmed !== title) onRename(trimmed)
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        className="btf-input ops-agent-plan-phase-input"
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
    )
  }

  return (
    <button
      type="button"
      className="ops-agent-plan-phase-edit"
      onClick={e => {
        e.stopPropagation()
        startEditing()
      }}
      disabled={pending}
      aria-label={`Rename phase ${title}`}
    >
      <Pencil size={13} aria-hidden />
    </button>
  )
}

function InlineAddForm({
  pending,
  placeholder,
  onAdd,
}: {
  pending: boolean
  placeholder: string
  onAdd: (title: string) => void
}) {
  const [title, setTitle] = useState('')

  return (
    <form
      className="ops-agent-plan-inline-form"
      onSubmit={e => {
        e.preventDefault()
        if (!title.trim()) return
        onAdd(title.trim())
        setTitle('')
      }}
    >
      <input
        className="btf-input"
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder={placeholder}
        disabled={pending}
      />
      <button type="submit" className="dash-btn-primary btn-primary" disabled={pending}>
        Add
      </button>
    </form>
  )
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
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({})
  const [addingSubtaskFor, setAddingSubtaskFor] = useState<string | null>(null)
  const [addingTaskForPhase, setAddingTaskForPhase] = useState<string | null>(null)
  const [phaseToDelete, setPhaseToDelete] = useState<{ id: string; name: string } | null>(null)
  const [taskToDelete, setTaskToDelete] = useState<OpsProjectTask | null>(null)

  const progressByPhase = groupTasksByPhase(project.tasks)
  const displayByPhase = groupTasksByPhase(visibleTasks ?? project.tasks)

  const expandedGroups = useMemo(
    () =>
      [
        ...project.phases.map(p => p.id),
        ...(progressByPhase.get(null)?.length ? ['__unassigned__'] : []),
      ].filter(id => !collapsedPhases.has(id)),
    [project.phases, progressByPhase, collapsedPhases]
  )

  function togglePhase(phaseId: string) {
    setCollapsedPhases(prev => {
      const next = new Set(prev)
      if (next.has(phaseId)) next.delete(phaseId)
      else next.add(phaseId)
      return next
    })
  }

  function toggleItemExpand(groupId: string, itemId: string) {
    setExpandedItems(prev => {
      const key = itemExpandKey(groupId, itemId)
      return { ...prev, [key]: !prev[key] }
    })
  }

  function updateTaskStatus(taskId: string, status: TaskStatus) {
    runWithToast(() => updateTask(taskId, { status }), {
      loading: 'Updating…',
      success: 'Task updated',
    }).then(() => onRefresh())
  }

  function updateTaskPriority(taskId: string, priority: TaskPriority) {
    runWithToast(() => updateTask(taskId, { priority }), {
      loading: 'Updating priority…',
      success: 'Priority updated',
    }).then(() => onRefresh())
  }

  function updateTaskAssignee(taskId: string, assigneeId: string | null) {
    runWithToast(() => updateTask(taskId, { assigneeId }), {
      loading: 'Updating assignee…',
      success: assigneeId
        ? `Assigned to ${staff.find(s => s.id === assigneeId)?.name ?? 'teammate'}`
        : 'Assignee cleared',
    }).then(() => onRefresh())
  }

  function handleStatusClick(
    groupId: string,
    itemId: string,
    options?: { childId?: string; markComplete?: boolean }
  ) {
    const phaseTasks = displayByPhase.get(groupId === '__unassigned__' ? null : groupId) ?? []
    const parent = phaseTasks.find(task => task.id === itemId)
    if (!parent) return

    if (options?.childId) {
      const child = parent.subtasks.find(sub => sub.id === options.childId)
      if (!child) return
      updateTaskStatus(
        child.id,
        resolveTaskStatusClick(child.status, { markComplete: options?.markComplete })
      )
      return
    }

    updateTaskStatus(
      parent.id,
      resolveTaskStatusClick(parent.status, { markComplete: options?.markComplete })
    )
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

  function buildGroup(
    phaseId: string,
    title: string,
    toneIndex: number,
    phase?: OpsProjectPhase
  ): AgentPlanGroup | null {
    const phaseTasks = displayByPhase.get(phaseId === '__unassigned__' ? null : phaseId) ?? []
    const progressTasks = progressByPhase.get(phaseId === '__unassigned__' ? null : phaseId) ?? []
    if (hideEmptyPhases && phaseTasks.length === 0) return null

    const doneCount = progressTasks.filter(t => t.status === 'done').length
    const canManage = Boolean(phase)

    return {
      id: phaseId,
      title,
      statusLabel: phase ? PHASE_STATUS_LABELS[phase.status] : undefined,
      statusTone: phase?.status,
      progress: { done: doneCount, total: progressTasks.length },
      headerExtra: (
        <div className="ops-agent-plan-phase-tools">
          {phase ? (
            <>
              <PhaseTitleEditor
                title={title}
                pending={pending}
                onRename={name => handlePhaseRename(phase.id, name)}
              />
              {progressTasks.length === 0 ? (
                <button
                  type="button"
                  className="ops-agent-plan-action-btn ops-agent-plan-action-btn--danger"
                  onClick={() => setPhaseToDelete({ id: phase.id, name: phase.name })}
                  disabled={pending}
                  aria-label={`Delete phase ${phase.name}`}
                >
                  <Trash2 size={13} aria-hidden />
                </button>
              ) : null}
              <PhaseStatusSelect
                value={phase.status}
                disabled={pending}
                className="ops-list-select"
                aria-label={`Status for phase ${phase.name}`}
                onChange={status => handlePhaseStatus(phase.id, status)}
              />
            </>
          ) : null}
          <span
            className={`ops-agent-plan-tone ops-agent-plan-tone--${toneIndex % PHASE_TONE_COUNT}`}
            aria-hidden
          />
        </div>
      ),
      emptyLabel:
        progressTasks.length === 0 ? 'No tasks in this phase' : 'No tasks match the current filters',
      items: phaseTasks.map(task => {
        const planItem = mapTaskToPlanItem(
          task,
          staff,
          pending,
          setTaskToDelete,
          updateTaskAssignee,
          updateTaskPriority
        )
        return {
          ...planItem,
          footer: (
            <div className="ops-agent-plan-item-footer">
              <button
                type="button"
                className="ops-agent-plan-add-subtask"
                onClick={() =>
                  setAddingSubtaskFor(current => (current === task.id ? null : task.id))
                }
                disabled={pending}
              >
                + SUBTASK
              </button>
              {addingSubtaskFor === task.id ? (
                <InlineAddForm
                  placeholder="Subtask title"
                  pending={pending}
                  onAdd={subtaskTitle => {
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
                      setAddingSubtaskFor(null)
                      onRefresh()
                    })
                  }}
                />
              ) : null}
            </div>
          ),
        }
      }),
      footer: (
        <div className="ops-agent-plan-item-footer">
          <button
            type="button"
            className="ops-agent-plan-add-subtask"
            onClick={() =>
              setAddingTaskForPhase(current => (current === phaseId ? null : phaseId))
            }
            disabled={pending}
          >
            + TASK
          </button>
          {addingTaskForPhase === phaseId ? (
            <InlineAddForm
              placeholder="Task title"
              pending={pending}
              onAdd={taskTitle => {
                runWithToast(
                  () =>
                    createTask({
                      projectId: project.id,
                      phaseId: phaseId === '__unassigned__' ? null : phaseId,
                      title: taskTitle,
                    }),
                  { loading: 'Adding task…', success: 'Task added' }
                ).then(() => {
                  setAddingTaskForPhase(null)
                  onRefresh()
                })
              }}
            />
          ) : null}
        </div>
      ),
    }
  }

  const groups = useMemo(() => {
    const built: AgentPlanGroup[] = []
    project.phases.forEach((phase, index) => {
      const group = buildGroup(phase.id, phase.name, index, phase)
      if (group) built.push(group)
    })

    const unphasedProgress = progressByPhase.get(null) ?? []
    const unphasedDisplay = displayByPhase.get(null) ?? []
    if (unphasedProgress.length > 0 || unphasedDisplay.length > 0) {
      const group = buildGroup('__unassigned__', 'Unassigned', PHASE_TONE_COUNT)
      if (group) built.push(group)
    }
    return built
  }, [
    project.phases,
    displayByPhase,
    progressByPhase,
    hideEmptyPhases,
    pending,
    staff,
    addingSubtaskFor,
    addingTaskForPhase,
    project.id,
  ])

  return (
    <div className="ops-list-view ops-list-view--agent-plan">
      <AgentPlan
        groups={groups}
        expandedGroups={expandedGroups}
        onToggleGroup={togglePhase}
        expandedItems={expandedItems}
        onToggleItem={(groupId, itemId) => toggleItemExpand(groupId, itemId)}
        onStatusClick={handleStatusClick}
        onItemOpen={onOpenTask}
        disabled={pending}
      />

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
