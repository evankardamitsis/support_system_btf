'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { ChevronDown, Ellipsis, Plus } from 'lucide-react'
import {
  completeProject,
  deleteProject,
  updateProjectCost,
  updateProjectStatus,
} from '@/app/actions/projects'
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal'
import { ProjectAddPanel } from '@/components/ops/projects/ProjectAddPanel'
import { ProjectKanban } from '@/components/ops/projects/ProjectKanban'
import { ProjectListView } from '@/components/ops/projects/ProjectListView'
import {
  formatProjectCost,
  formatProjectDate,
  parseProjectCostInput,
} from '@/lib/ops/projects/display'
import { filterProjectTasks, type AssigneeFilter } from '@/lib/ops/projects/filter-tasks'
import type { OpsProjectDetail, ProjectStatus } from '@/lib/ops/projects/types'
import { notifyError, runWithToast } from '@/lib/notify'

type StaffOption = { id: string; name: string }

const STATUS_LABELS: Record<ProjectStatus, string> = {
  active: 'Active',
  on_hold: 'On hold',
  completed: 'Completed',
  archived: 'Archived',
}

export function ProjectDetail({
  project,
  staff,
}: {
  project: OpsProjectDetail
  staff: StaffOption[]
}) {
  const router = useRouter()
  const [view, setView] = useState<'kanban' | 'list'>(() =>
    typeof window !== 'undefined' && window.matchMedia('(min-width: 1025px)').matches
      ? 'kanban'
      : 'list'
  )
  const [assigneeFilter, setAssigneeFilter] = useState<AssigneeFilter>('all')
  const [headerExpanded, setHeaderExpanded] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [pending, startTransition] = useTransition()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmComplete, setConfirmComplete] = useState(false)
  const [actionsOpen, setActionsOpen] = useState(false)
  const actionsRef = useRef<HTMLDivElement>(null)
  const canComplete = project.status === 'active' || project.status === 'on_hold'
  const [costInput, setCostInput] = useState(
    project.costAmount != null ? String(project.costAmount) : ''
  )
  const [editingCost, setEditingCost] = useState(false)
  const [syncedAt, setSyncedAt] = useState(project.updatedAt)

  if (project.updatedAt !== syncedAt && !editingCost) {
    setSyncedAt(project.updatedAt)
    setCostInput(project.costAmount != null ? String(project.costAmount) : '')
  }

  const pct =
    project.taskCount > 0 ? Math.round((project.doneTaskCount / project.taskCount) * 100) : 0

  const filteredTasks = useMemo(
    () => filterProjectTasks(project.tasks, assigneeFilter),
    [project.tasks, assigneeFilter]
  )

  const filteredProject = useMemo(
    () => ({ ...project, tasks: filteredTasks }),
    [project, filteredTasks]
  )

  useEffect(() => {
    if (!actionsOpen) return
    const handlePointer = (event: MouseEvent) => {
      if (actionsRef.current && !actionsRef.current.contains(event.target as Node)) {
        setActionsOpen(false)
      }
    }
    document.addEventListener('mousedown', handlePointer)
    return () => document.removeEventListener('mousedown', handlePointer)
  }, [actionsOpen])

  function handleStatusChange(status: ProjectStatus) {
    startTransition(async () => {
      await runWithToast(() => updateProjectStatus(project.id, status), {
        loading: 'Updating…',
        success: 'Project updated',
      })
      router.refresh()
    })
  }

  function handleCostSave() {
    setEditingCost(false)
    startTransition(async () => {
      let costAmount: number | null
      try {
        costAmount = parseProjectCostInput(costInput)
      } catch (err) {
        notifyError(err instanceof Error ? err.message : 'Invalid project cost')
        setCostInput(project.costAmount != null ? String(project.costAmount) : '')
        return
      }

      if (costAmount === project.costAmount) return

      const ok = await runWithToast(() => updateProjectCost(project.id, costAmount), {
        loading: 'Saving cost…',
        success: 'Cost updated',
      })
      if (ok === null) {
        setCostInput(project.costAmount != null ? String(project.costAmount) : '')
        return
      }
      router.refresh()
    })
  }

  function handleDelete() {
    startTransition(async () => {
      const ok = await runWithToast(() => deleteProject(project.id), {
        loading: 'Deleting…',
        success: 'Project deleted',
      })
      if (ok === null) return
      setConfirmDelete(false)
      router.push('/admin/ops/projects')
    })
  }

  function handleComplete() {
    startTransition(async () => {
      const ok = await runWithToast(() => completeProject(project.id), {
        loading: 'Completing project…',
        success: 'Project marked as completed',
      })
      if (ok === null) return
      setConfirmComplete(false)
      router.refresh()
    })
  }

  return (
    <div className="space-y-6 w-full">
      <Link href="/admin/ops/projects" className="dash-back">
        ← Back to projects
      </Link>

      <header
        className={`ops-project-head ops-project-head--status-${project.status}${headerExpanded ? ' ops-project-head--expanded' : ' ops-project-head--collapsed'}`}
      >
        <div className="ops-project-head-grid">
          <button
            type="button"
            className="ops-project-head-toggle"
            onClick={() => setHeaderExpanded(v => !v)}
            aria-expanded={headerExpanded}
            aria-label={headerExpanded ? 'Collapse project header' : 'Expand project header'}
          >
            <ChevronDown
              size={18}
              className={`ops-project-head-chevron${headerExpanded ? '' : ' ops-project-head-chevron--collapsed'}`}
              aria-hidden
            />
          </button>

          <div className="ops-project-head-copy min-w-0">
            <div className="ops-project-head-identity">
              <h1 className="ops-project-title">{project.name}</h1>
              <p className="ops-project-eyebrow">
                <span className={`ops-project-status-pill ops-project-status-pill--${project.status}`}>
                  {STATUS_LABELS[project.status]}
                </span>
                {project.isInternal ? (
                  <span className="ops-projects-internal-badge">Internal</span>
                ) : (
                  <span>{project.clientName ?? 'No client'}</span>
                )}
                {project.financialOfferId ? (
                  <>
                    <span className="ops-project-sep" aria-hidden>
                      ·
                    </span>
                    <Link href="/admin/ops/financial-offers" className="ops-project-eyebrow-link">
                      Linked offer
                    </Link>
                  </>
                ) : null}
                {project.leadName ? (
                  <>
                    <span className="ops-project-sep" aria-hidden>
                      ·
                    </span>
                    <span>Lead: {project.leadName}</span>
                  </>
                ) : null}
              </p>
            </div>

            {project.description ? (
              <p className="ops-project-description" title={project.description}>
                {project.description}
              </p>
            ) : null}

            <dl className="ops-project-stats">
              <div className="ops-project-stat ops-project-stat--cost">
                <dt>Cost</dt>
                <dd>
                  {editingCost ? (
                    <input
                      type="text"
                      inputMode="decimal"
                      className="btf-input ops-project-cost-input"
                      value={costInput}
                      disabled={pending}
                      placeholder="EUR amount"
                      aria-label="Project cost in EUR"
                      onChange={e => setCostInput(e.target.value)}
                      onBlur={handleCostSave}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleCostSave()
                        }
                        if (e.key === 'Escape') {
                          setCostInput(project.costAmount != null ? String(project.costAmount) : '')
                          setEditingCost(false)
                        }
                      }}
                      autoFocus
                    />
                  ) : (
                    <button
                      type="button"
                      className="ops-project-stat-value ops-project-stat-value--cost"
                      disabled={pending}
                      onClick={() => setEditingCost(true)}
                      title="Click to edit project cost"
                    >
                      {formatProjectCost(project.costAmount)}
                    </button>
                  )}
                  {project.financialOfferId ? (
                    <span className="ops-project-stat-hint">From offer</span>
                  ) : null}
                </dd>
              </div>

              <div className="ops-project-stat">
                <dt>Start</dt>
                <dd className="ops-project-stat-value tabular-nums">
                  <time dateTime={project.startDate ?? undefined}>
                    {formatProjectDate(project.startDate)}
                  </time>
                </dd>
              </div>

              <div className="ops-project-stat">
                <dt>Target</dt>
                <dd className="ops-project-stat-value tabular-nums">
                  <time dateTime={project.targetDate ?? undefined}>
                    {formatProjectDate(project.targetDate)}
                  </time>
                </dd>
              </div>
            </dl>
          </div>

          <div className="ops-project-toolbar" data-pending={pending ? 'true' : undefined}>
            <div className="ops-project-control">
              <span className="ops-project-control-label">Status</span>
              <select
                className="btf-input ops-project-status-select"
                value={project.status}
                disabled={pending}
                onChange={e => handleStatusChange(e.target.value as ProjectStatus)}
                aria-label="Project status"
              >
                {(Object.keys(STATUS_LABELS) as ProjectStatus[]).map(s => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>

            <div className="ops-project-control">
              <span className="ops-project-control-label">View</span>
              <div className="ops-project-view-toggle" role="tablist" aria-label="View mode">
                <button
                  type="button"
                  role="tab"
                  aria-selected={view === 'kanban'}
                  className={`ops-project-view-btn${view === 'kanban' ? ' ops-project-view-btn--active' : ''}`}
                  onClick={() => setView('kanban')}
                >
                  Kanban
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={view === 'list'}
                  className={`ops-project-view-btn${view === 'list' ? ' ops-project-view-btn--active' : ''}`}
                  onClick={() => setView('list')}
                >
                  List
                </button>
              </div>
            </div>

            <div className="ops-project-toolbar-actions">
              <button
                type="button"
                className="dash-btn-primary btn-primary ops-project-add-btn"
                onClick={() => setShowAddModal(true)}
                disabled={pending}
                aria-haspopup="dialog"
                aria-label="Add task"
              >
                <Plus size={15} aria-hidden />
                <span className="ops-project-add-btn-label">Add task</span>
              </button>
              <div className="ops-project-actions-menu" ref={actionsRef}>
                <button
                  type="button"
                  className={`ops-project-actions-btn${actionsOpen ? ' ops-project-actions-btn--open' : ''}`}
                  onClick={() => setActionsOpen(open => !open)}
                  disabled={pending}
                  aria-haspopup="menu"
                  aria-expanded={actionsOpen}
                  aria-label="Project actions"
                >
                  <Ellipsis size={15} aria-hidden />
                  <span className="ops-project-actions-label">Actions</span>
                </button>
                {actionsOpen ? (
                  <div className="ops-project-actions-dropdown" role="menu">
                    {canComplete ? (
                      <button
                        type="button"
                        role="menuitem"
                        className="ops-project-actions-item ops-project-actions-item--complete"
                        disabled={pending}
                        onClick={() => {
                          setActionsOpen(false)
                          setConfirmComplete(true)
                        }}
                      >
                        Complete project
                      </button>
                    ) : null}
                    <button
                      type="button"
                      role="menuitem"
                      className="ops-project-actions-item ops-project-actions-item--danger"
                      disabled={pending}
                      onClick={() => {
                        setActionsOpen(false)
                        setConfirmDelete(true)
                      }}
                    >
                      Delete project
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </header>

      <ProjectAddPanel
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        project={project}
        staff={staff}
        onRefresh={() => router.refresh()}
      />

      <div className="ops-project-toolbar-row">
        {staff.length > 0 ? (
          <div className="ops-project-filters">
            <select
              className="btf-input ops-project-filter-select"
              value={assigneeFilter}
              onChange={e => setAssigneeFilter(e.target.value)}
              aria-label="Filter tasks by assignee"
            >
              <option value="all">All assignees</option>
              <option value="unassigned">Unassigned</option>
              {staff.map(member => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div className="ops-project-progress">
          <span className="ops-progress-label ops-project-progress-label">Progress</span>
          <div
            className="ops-project-progress-bar"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${pct}% complete, ${project.doneTaskCount} of ${project.taskCount} tasks done`}
          >
            <div className="ops-project-progress-fill" style={{ width: `${pct}%` }} />
            <p className="ops-project-progress-meta tabular-nums" aria-live="polite">
              <span className="ops-progress-pct ops-project-progress-pct">{pct}%</span>
              <span className="ops-project-progress-meta-sep" aria-hidden>
                ·
              </span>
              <span className="ops-progress-copy ops-project-progress-tasks">
                {project.doneTaskCount}/{project.taskCount} tasks
              </span>
            </p>
          </div>
        </div>
      </div>

      {assigneeFilter !== 'all' && filteredTasks.length === 0 ? (
        <div className="dash-empty">
          <p className="dash-empty-title">No tasks for this assignee</p>
          <p className="dash-empty-hint">
            Try another assignee or switch back to all assignees.
          </p>
        </div>
      ) : view === 'kanban' ? (
        <ProjectKanban project={filteredProject} staff={staff} />
      ) : (
        <ProjectListView
          project={filteredProject}
          staff={staff}
          hideEmptyPhases={assigneeFilter !== 'all'}
          onRefresh={() => router.refresh()}
        />
      )}

      <ConfirmDeleteModal
        open={confirmComplete}
        onClose={() => setConfirmComplete(false)}
        title="Complete project?"
        description={
          <>
            This marks <strong>{project.name}</strong> as completed and sets all open tasks and
            phases to done. The project stays in your list.
          </>
        }
        confirmLabel="Complete project"
        confirmVariant="primary"
        pendingLabel="Completing…"
        pending={pending}
        onConfirm={handleComplete}
      />

      <ConfirmDeleteModal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete project?"
        description={
          <>
            This removes <strong>{project.name}</strong> and all its phases and tasks.
          </>
        }
        confirmLabel="Delete project"
        pending={pending}
        onConfirm={handleDelete}
      />
    </div>
  )
}
