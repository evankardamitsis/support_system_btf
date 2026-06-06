'use client'

import { useState, useTransition } from 'react'
import { ChevronDown } from 'lucide-react'
import { createTask, updatePhaseStatus, updateTask } from '@/app/actions/projects'
import {
  PhaseStatusSelect,
  TaskPrioritySelect,
  TaskStatusSelect,
} from '@/components/ops/projects/StatusSelect'
import {
  EditableAssigneeSelect,
  type AssigneeOption,
} from '@/components/tickets/EditableAssigneeSelect'
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

const PHASE_TONE_COUNT = 6

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
  pending: boolean
  children: React.ReactNode
}) {
  const phasePct = taskCount > 0 ? (doneCount / taskCount) * 100 : 0
  const toneClass = `ops-list-phase--tone-${toneIndex % PHASE_TONE_COUNT}`

  return (
    <section
      className={`ops-list-phase ${toneClass}${collapsed ? ' ops-list-phase--collapsed' : ''}`}
    >
      <div className="ops-list-phase-head">
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
          <span className="ops-list-phase-title">{title}</span>
          <span className="ops-list-phase-count">{taskCount}</span>
        </button>
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
          <span className="ops-list-phase-progress-label">
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
            <span className="ops-list-task-title">{task.title}</span>
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
      {task.subtasks.length > 0 ? (
        <div className="ops-list-subtasks">
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
      ) : null}
    </div>
  )
}

export function ProjectListView({
  project,
  staff,
  hideEmptyPhases = false,
  onRefresh,
}: {
  project: OpsProjectDetail
  staff: StaffOption[]
  hideEmptyPhases?: boolean
  onRefresh: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [collapsedPhases, setCollapsedPhases] = useState<Set<string>>(() => new Set())

  function togglePhase(phaseId: string) {
    setCollapsedPhases(prev => {
      const next = new Set(prev)
      if (next.has(phaseId)) next.delete(phaseId)
      else next.add(phaseId)
      return next
    })
  }

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

  const unphased = tasksByPhase.get(null) ?? []

  return (
    <div className="ops-list-view">
      {project.phases.map((phase, index) => {
        const phaseTasks = tasksByPhase.get(phase.id) ?? []
        if (hideEmptyPhases && phaseTasks.length === 0) return null
        const doneCount = phaseTasks.filter(t => t.status === 'done').length
        return (
          <PhaseSection
            key={phase.id}
            phaseId={phase.id}
            title={phase.name}
            toneIndex={index}
            status={phase.status}
            taskCount={phaseTasks.length}
            doneCount={doneCount}
            collapsed={collapsedPhases.has(phase.id)}
            onToggle={togglePhase}
            onStatusChange={status => handlePhaseStatus(phase.id, status)}
            pending={pending}
          >
            {phaseTasks.length === 0 ? (
              <p className="ops-list-empty">No tasks in this phase</p>
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
          </PhaseSection>
        )
      })}

      {unphased.length > 0 ? (
        <PhaseSection
          phaseId="__unassigned__"
          title="Unassigned"
          toneIndex={PHASE_TONE_COUNT}
          taskCount={unphased.length}
          doneCount={unphased.filter(t => t.status === 'done').length}
          collapsed={collapsedPhases.has('__unassigned__')}
          onToggle={togglePhase}
          pending={pending}
        >
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
        </PhaseSection>
      ) : null}
    </div>
  )
}
