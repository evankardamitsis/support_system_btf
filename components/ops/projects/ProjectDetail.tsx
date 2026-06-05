'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { deleteProject, updateProjectStatus } from '@/app/actions/projects'
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal'
import { ProjectKanban } from '@/components/ops/projects/ProjectKanban'
import { ProjectListView } from '@/components/ops/projects/ProjectListView'
import type { OpsProjectDetail, ProjectStatus } from '@/lib/ops/projects/types'
import { runWithToast } from '@/lib/notify'

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
  const [view, setView] = useState<'kanban' | 'list'>('kanban')
  const [pending, startTransition] = useTransition()
  const [confirmDelete, setConfirmDelete] = useState(false)

  const pct =
    project.taskCount > 0 ? Math.round((project.doneTaskCount / project.taskCount) * 100) : 0

  function handleStatusChange(status: ProjectStatus) {
    startTransition(async () => {
      await runWithToast(() => updateProjectStatus(project.id, status), {
        loading: 'Updating…',
        success: 'Project updated',
      })
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

  return (
    <div className="space-y-6 w-full">
      <Link href="/admin/ops/projects" className="dash-back">
        ← Back to projects
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-[var(--text-1)]">{project.name}</h1>
          <div className="flex flex-wrap items-center gap-3 mt-1">
            {project.isInternal ? (
              <span className="ops-projects-internal-badge">Internal</span>
            ) : (
              <span className="dash-meta">{project.clientName ?? 'No client'}</span>
            )}
            {project.leadName ? <span className="dash-meta">Lead: {project.leadName}</span> : null}
            <span className="dash-meta tabular-nums">
              {project.doneTaskCount}/{project.taskCount} tasks · {pct}%
            </span>
            {project.financialOfferId ? (
              <Link href="/admin/ops/financial-offers" className="dash-meta underline">
                Linked offer
              </Link>
            ) : null}
          </div>
          {project.description ? <p className="dash-meta mt-2">{project.description}</p> : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            className="btf-input"
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
          <button
            type="button"
            className="dash-btn-ghost text-red-400"
            onClick={() => setConfirmDelete(true)}
            disabled={pending}
          >
            Delete
          </button>
        </div>
      </div>

      {view === 'kanban' ? (
        <ProjectKanban project={project} />
      ) : (
        <ProjectListView project={project} staff={staff} onRefresh={() => router.refresh()} />
      )}

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
