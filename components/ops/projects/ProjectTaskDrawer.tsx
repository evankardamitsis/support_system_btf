'use client'

import { useEffect, useState, useTransition } from 'react'
import { ChevronDown, Plus, X } from 'lucide-react'
import { listProjectFiles } from '@/app/actions/project-attachments'
import { createTask, deleteTask, updateTask } from '@/app/actions/projects'
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal'
import { ProjectFilePanel } from '@/components/ops/projects/ProjectFilePanel'
import { ProjectTaskComments } from '@/components/ops/projects/ProjectTaskComments'
import {
  TaskPrioritySelect,
  TaskStatusSelect,
} from '@/components/ops/projects/StatusSelect'
import {
  EditableAssigneeSelect,
  type AssigneeOption,
} from '@/components/tickets/EditableAssigneeSelect'
import { findParentProjectTask } from '@/lib/ops/projects/find-task'
import { phaseToneIndexFromPhaseId, phaseToneLabelClass } from '@/lib/ops/projects/phase-tone'
import type {
  OpsProjectDetail,
  OpsProjectTask,
  TaskPriority,
  TaskStatus,
} from '@/lib/ops/projects/types'
import { runWithToast } from '@/lib/notify'

const DRAWER_ANIM_MS = 180

type StaffOption = AssigneeOption

function DrawerAccordion({
  id,
  title,
  badge,
  open,
  onToggle,
  children,
}: {
  id: string
  title: string
  badge?: string
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className={`ops-task-drawer-accordion${open ? ' ops-task-drawer-accordion--open' : ''}`}>
      <button
        type="button"
        className="ops-task-drawer-accordion-trigger"
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        onClick={onToggle}
      >
        <ChevronDown
          size={16}
          className={`ops-task-drawer-accordion-chevron${open ? '' : ' ops-task-drawer-accordion-chevron--collapsed'}`}
          aria-hidden
        />
        <span className="ops-task-drawer-accordion-title">{title}</span>
        {badge ? <span className="ops-task-drawer-accordion-badge">{badge}</span> : null}
      </button>
      {open ? (
        <div id={`${id}-panel`} className="ops-task-drawer-accordion-panel">
          {children}
        </div>
      ) : null}
    </div>
  )
}

function SubtaskAddControl({
  open,
  onOpen,
  onClose,
  subtaskTitle,
  onTitleChange,
  onSubmit,
  pending,
}: {
  open: boolean
  onOpen: () => void
  onClose: () => void
  subtaskTitle: string
  onTitleChange: (value: string) => void
  onSubmit: (event: React.FormEvent) => void
  pending: boolean
}) {
  if (!open) {
    return (
      <button
        type="button"
        className="ops-task-drawer-add-btn"
        onClick={onOpen}
        disabled={pending}
        aria-label="Add subtask"
      >
        <Plus size={16} aria-hidden />
      </button>
    )
  }

  return (
    <form onSubmit={onSubmit} className="ops-task-drawer-subtask-form">
      <input
        className="btf-input"
        value={subtaskTitle}
        onChange={e => onTitleChange(e.target.value)}
        placeholder="Subtask title"
        disabled={pending}
        autoFocus
      />
      <button type="submit" className="dash-btn-secondary btn-secondary" disabled={pending}>
        Add
      </button>
      <button
        type="button"
        className="ops-task-drawer-add-cancel"
        onClick={onClose}
        disabled={pending}
        aria-label="Cancel"
      >
        <X size={14} aria-hidden />
      </button>
    </form>
  )
}

export function ProjectTaskDrawer({
  open,
  task,
  project,
  staff,
  onClose,
  onOpenTask,
  onRefresh,
}: {
  open: boolean
  task: OpsProjectTask | null
  project: OpsProjectDetail
  staff: StaffOption[]
  onClose: () => void
  onOpenTask: (taskId: string) => void
  onRefresh: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [subtaskTitle, setSubtaskTitle] = useState('')
  const [addingSubtask, setAddingSubtask] = useState(false)
  const [descriptionOpen, setDescriptionOpen] = useState(false)
  const [subtasksOpen, setSubtasksOpen] = useState(false)
  const [filesOpen, setFilesOpen] = useState(false)
  const [fileCount, setFileCount] = useState(0)
  const [syncedRevision, setSyncedRevision] = useState('')
  const [mounted, setMounted] = useState(open)
  const [closing, setClosing] = useState(false)
  const [cachedTask, setCachedTask] = useState<OpsProjectTask | null>(task)
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (open && task) {
    if (!mounted) setMounted(true)
    if (closing) setClosing(false)
    if (cachedTask !== task) setCachedTask(task)
  } else if (mounted && !closing) {
    setClosing(true)
  }

  useEffect(() => {
    if (!closing) return
    const timer = window.setTimeout(() => {
      setMounted(false)
      setClosing(false)
      setCachedTask(null)
    }, DRAWER_ANIM_MS)
    return () => window.clearTimeout(timer)
  }, [closing])

  const drawerTask = task ?? cachedTask

  const taskRevision = task
    ? `${task.id}:${project.updatedAt}:${task.title}:${task.description ?? ''}:${task.dueDate ?? ''}:${task.subtasks.length}`
    : ''

  if (task && taskRevision !== syncedRevision) {
    setSyncedRevision(taskRevision)
    setTitle(task.title)
    setDescription(task.description ?? '')
    setDueDate(task.dueDate ?? '')
    setSubtaskTitle('')
    setAddingSubtask(false)
    setDescriptionOpen(Boolean(task.description?.trim()))
    setSubtasksOpen(task.subtasks.length > 0)
    setFilesOpen(false)
    setFileCount(0)
  }

  useEffect(() => {
    if (!open || !task) return
    let cancelled = false
    void listProjectFiles(project.id, 'task', task.id).then(files => {
      if (cancelled) return
      setFileCount(files.length)
      setFilesOpen(files.length > 0)
    })
    return () => {
      cancelled = true
    }
  }, [open, task, project.id])

  useEffect(() => {
    if (!mounted || closing) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [mounted, closing, onClose])

  useEffect(() => {
    if (!mounted) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [mounted])

  if (!mounted || !drawerTask) return null

  const activeTask: OpsProjectTask = drawerTask
  const parentTask = findParentProjectTask(project.tasks, activeTask.id)
  const isSubtask = Boolean(activeTask.parentId)
  const canManageSubtasks = !isSubtask
  const doneSubtasks = activeTask.subtasks.filter(sub => sub.status === 'done').length
  const subtaskCount = activeTask.subtasks.length
  const hasDescription = Boolean(description.trim())
  const hasSubtasks = subtaskCount > 0
  const hasFiles = fileCount > 0

  function persist(patch: Parameters<typeof updateTask>[1], toast: { loading: string; success: string }) {
    startTransition(async () => {
      const ok = await runWithToast(() => updateTask(activeTask.id, patch), toast)
      if (ok === null) return
      onRefresh()
    })
  }

  function handleTitleBlur() {
    const next = title.trim()
    if (!next || next === activeTask.title) {
      setTitle(activeTask.title)
      return
    }
    persist({ title: next }, { loading: 'Saving title…', success: 'Title updated' })
  }

  function handleDescriptionBlur() {
    const next = description.trim() || null
    if (next === (activeTask.description?.trim() || null)) return
    persist({ description: next }, { loading: 'Saving description…', success: 'Description updated' })
  }

  function handleDueDateChange(value: string) {
    setDueDate(value)
    const next = value || null
    if (next === activeTask.dueDate) return
    persist({ dueDate: next }, { loading: 'Saving due date…', success: 'Due date updated' })
  }

  function handleAddSubtask(event: React.FormEvent) {
    event.preventDefault()
    const nextTitle = subtaskTitle.trim()
    if (!nextTitle) return
    startTransition(async () => {
      const ok = await runWithToast(
        () =>
          createTask({
            projectId: project.id,
            phaseId: activeTask.phaseId,
            parentId: activeTask.id,
            title: nextTitle,
          }),
        { loading: 'Adding subtask…', success: 'Subtask added' }
      )
      if (ok === null) return
      setSubtaskTitle('')
      setAddingSubtask(false)
      setSubtasksOpen(true)
      onRefresh()
    })
  }

  function handleDelete() {
    startTransition(async () => {
      const ok = await runWithToast(() => deleteTask(activeTask.id), {
        loading: 'Deleting task…',
        success: 'Task deleted',
      })
      if (ok === null) return
      setConfirmDelete(false)
      onClose()
      onRefresh()
    })
  }

  return (
    <div
      className={`ops-task-drawer-root${closing ? ' ops-task-drawer-root--closing' : ''}`}
      onMouseDown={event => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <aside
        className={`ops-task-drawer${closing ? ' ops-task-drawer--closing' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ops-task-drawer-title"
        onMouseDown={event => event.stopPropagation()}
      >
        <header className="ops-task-drawer-head">
          <div className="ops-task-drawer-head-copy">
            {parentTask ? (
              <button
                type="button"
                className="ops-task-drawer-parent"
                onClick={() => onOpenTask(parentTask.id)}
              >
                ← {parentTask.title}
              </button>
            ) : null}
            <div className="ops-task-drawer-head-meta">
              {activeTask.phaseName ? (
                <span
                  className={`ops-task-drawer-phase ${phaseToneLabelClass(phaseToneIndexFromPhaseId(activeTask.phaseId, project.phases))}`}
                >
                  {activeTask.phaseName}
                </span>
              ) : null}
              {isSubtask ? <span className="ops-task-drawer-kind">Subtask</span> : null}
            </div>
            <input
              id="ops-task-drawer-title"
              className="ops-task-drawer-title-input"
              value={title}
              disabled={pending}
              onChange={e => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={e => {
                if (e.key === 'Enter') e.currentTarget.blur()
              }}
              aria-label="Task title"
            />
          </div>
          <button
            type="button"
            className="ops-task-drawer-close"
            onClick={onClose}
            aria-label="Close task panel"
          >
            <X size={18} aria-hidden />
          </button>
        </header>

        <div className="ops-task-drawer-body">
          <section className="ops-task-drawer-primary" aria-label="Task workflow">
            <TaskStatusSelect
              value={activeTask.status}
              disabled={pending}
              className="ops-task-drawer-status-select"
              aria-label={`Status for ${activeTask.title}`}
              onChange={(status: TaskStatus) =>
                persist({ status }, { loading: 'Updating status…', success: 'Status updated' })
              }
            />
            <div className="ops-task-drawer-fields ops-task-drawer-fields--inline">
              <label className="ops-task-drawer-field">
                <span className="ops-task-drawer-field-label">Priority</span>
                <TaskPrioritySelect
                  value={activeTask.priority}
                  disabled={pending}
                  className="ops-task-drawer-select"
                  aria-label={`Priority for ${activeTask.title}`}
                  onChange={(priority: TaskPriority) =>
                    persist({ priority }, { loading: 'Updating priority…', success: 'Priority updated' })
                  }
                />
              </label>
              {staff.length > 0 ? (
                <label className="ops-task-drawer-field">
                  <span className="ops-task-drawer-field-label">Assignee</span>
                  <EditableAssigneeSelect
                    value={activeTask.assigneeId}
                    options={staff}
                    disabled={pending}
                    className="ops-task-assignee ops-task-drawer-assignee"
                    ariaLabel={`Assignee for ${activeTask.title}`}
                    onChange={assigneeId =>
                      persist(
                        { assigneeId },
                        {
                          loading: 'Updating assignee…',
                          success: assigneeId
                            ? `Assigned to ${staff.find(s => s.id === assigneeId)?.name ?? 'teammate'}`
                            : 'Assignee cleared',
                        }
                      )
                    }
                  />
                </label>
              ) : null}
              <label className="ops-task-drawer-field">
                <span className="ops-task-drawer-field-label">Due</span>
                <input
                  type="date"
                  className="btf-input ops-task-drawer-date"
                  value={dueDate}
                  disabled={pending}
                  onChange={e => handleDueDateChange(e.target.value)}
                />
              </label>
              {!isSubtask && project.phases.length > 0 ? (
                <label className="ops-task-drawer-field">
                  <span className="ops-task-drawer-field-label">Phase</span>
                  <select
                    className="btf-input ops-task-drawer-select-native"
                    value={activeTask.phaseId ?? ''}
                    disabled={pending}
                    onChange={e =>
                      persist(
                        { phaseId: e.target.value || null },
                        { loading: 'Moving phase…', success: 'Phase updated' }
                      )
                    }
                  >
                    <option value="">No phase</option>
                    {project.phases.map(phase => (
                      <option key={phase.id} value={phase.id}>
                        {phase.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>
          </section>

          <section className="ops-task-drawer-description-block">
            {descriptionOpen ? (
              <>
                <div className="ops-task-drawer-description-head">
                  <span className="ops-task-drawer-description-label">Description</span>
                  {hasDescription ? (
                    <button
                      type="button"
                      className="ops-task-drawer-text-action"
                      onClick={() => setDescriptionOpen(false)}
                    >
                      Collapse
                    </button>
                  ) : null}
                </div>
                <textarea
                  className="btf-input ops-task-drawer-notes"
                  value={description}
                  disabled={pending}
                  placeholder="Context, links, acceptance criteria…"
                  rows={3}
                  onChange={e => setDescription(e.target.value)}
                  onBlur={handleDescriptionBlur}
                />
              </>
            ) : (
              <button
                type="button"
                className="ops-task-drawer-description-preview"
                onClick={() => setDescriptionOpen(true)}
              >
                {hasDescription ? (
                  <span className="ops-task-drawer-description-snippet">{description}</span>
                ) : (
                  <span className="ops-task-drawer-description-placeholder">Add description…</span>
                )}
              </button>
            )}
          </section>

          <div className="ops-task-drawer-stack">
            {hasSubtasks ? (
              <DrawerAccordion
                id="task-subtasks"
                title="Subtasks"
                badge={`${doneSubtasks}/${subtaskCount}`}
                open={subtasksOpen}
                onToggle={() => setSubtasksOpen(open => !open)}
              >
                <ul className="ops-task-drawer-subtasks">
                  {activeTask.subtasks.map(sub => (
                    <li key={sub.id} className="ops-task-drawer-subtask">
                      <TaskStatusSelect
                        value={sub.status}
                        disabled={pending}
                        className="ops-task-drawer-subtask-status"
                        aria-label={`Status for ${sub.title}`}
                        onChange={status => {
                          startTransition(async () => {
                            const ok = await runWithToast(() => updateTask(sub.id, { status }), {
                              loading: 'Updating subtask…',
                              success: 'Subtask updated',
                            })
                            if (ok === null) return
                            onRefresh()
                          })
                        }}
                      />
                      <button
                        type="button"
                        className="ops-task-drawer-subtask-title"
                        onClick={() => onOpenTask(sub.id)}
                      >
                        {sub.title}
                      </button>
                    </li>
                  ))}
                </ul>
                <SubtaskAddControl
                  open={addingSubtask}
                  onOpen={() => setAddingSubtask(true)}
                  onClose={() => {
                    setAddingSubtask(false)
                    setSubtaskTitle('')
                  }}
                  subtaskTitle={subtaskTitle}
                  onTitleChange={setSubtaskTitle}
                  onSubmit={handleAddSubtask}
                  pending={pending}
                />
              </DrawerAccordion>
            ) : canManageSubtasks ? (
              <SubtaskAddControl
                open={addingSubtask}
                onOpen={() => setAddingSubtask(true)}
                onClose={() => {
                  setAddingSubtask(false)
                  setSubtaskTitle('')
                }}
                subtaskTitle={subtaskTitle}
                onTitleChange={setSubtaskTitle}
                onSubmit={handleAddSubtask}
                pending={pending}
              />
            ) : null}

            {hasFiles ? (
              <DrawerAccordion
                id="task-files"
                title="Files"
                badge={String(fileCount)}
                open={filesOpen}
                onToggle={() => setFilesOpen(open => !open)}
              >
                <ProjectFilePanel
                  projectId={project.id}
                  taskId={activeTask.id}
                  title="Files"
                  emptyLabel=""
                  embedded
                  hideEmpty
                  hideLoading
                  onCountChange={count => {
                    setFileCount(count)
                    if (count > 0) setFilesOpen(true)
                  }}
                />
              </DrawerAccordion>
            ) : (
              <ProjectFilePanel
                projectId={project.id}
                taskId={activeTask.id}
                title="Files"
                emptyLabel=""
                embedded
                compactUpload
                hideEmpty
                hideLoading
                onCountChange={count => {
                  setFileCount(count)
                  if (count > 0) setFilesOpen(true)
                }}
              />
            )}
          </div>

          <ProjectTaskComments taskId={activeTask.id} staff={staff} embedded concise hideEmpty />

          <footer className="ops-task-drawer-footer">
            <button
              type="button"
              className="ops-task-drawer-delete"
              disabled={pending}
              onClick={() => setConfirmDelete(true)}
            >
              Delete task
            </button>
          </footer>
        </div>
      </aside>

      <ConfirmDeleteModal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete task?"
        description={
          <>
            This removes <strong>{activeTask.title}</strong>
            {subtaskCount > 0
              ? ` and its ${subtaskCount} subtask${subtaskCount === 1 ? '' : 's'}`
              : ''}
            . Comments and files stay in storage but won&apos;t appear in the project.
          </>
        }
        confirmLabel="Delete task"
        pending={pending}
        onConfirm={handleDelete}
      />
    </div>
  )
}
