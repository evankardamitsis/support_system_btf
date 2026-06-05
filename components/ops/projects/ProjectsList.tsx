'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { formatProjectCost, formatProjectDate } from '@/lib/ops/projects/display'
import type { OpsProjectRecord, ProjectStatus } from '@/lib/ops/projects/types'

const STATUS_LABELS: Record<ProjectStatus, string> = {
  active: 'Active',
  on_hold: 'On hold',
  completed: 'Completed',
  archived: 'Archived',
}

const FILTERS: Array<ProjectStatus | 'all'> = ['all', 'active', 'on_hold', 'completed', 'archived']

export function ProjectsList({ projects }: { projects: OpsProjectRecord[] }) {
  const [filter, setFilter] = useState<ProjectStatus | 'all'>('all')

  const filtered = useMemo(() => {
    if (filter === 'all') return projects
    return projects.filter(p => p.status === filter)
  }, [projects, filter])

  if (projects.length === 0) {
    return (
      <div className="dash-empty">
        <p className="dash-empty-title">No projects yet</p>
        <p className="dash-empty-hint">
          Create a project from a template or from an accepted financial offer.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="ops-projects-filters" role="tablist" aria-label="Filter projects">
        {FILTERS.map(value => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={filter === value}
            className={`ops-projects-filter${filter === value ? ' ops-projects-filter--active' : ''}`}
            onClick={() => setFilter(value)}
          >
            {value === 'all' ? 'All' : STATUS_LABELS[value]}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="dash-empty">
          <p className="dash-empty-title">No {filter === 'all' ? '' : STATUS_LABELS[filter].toLowerCase()} projects</p>
        </div>
      ) : (
        <div className="ops-projects-table">
          <div className="ops-projects-grid ops-projects-grid-head">
            <span>Project</span>
            <span>Client</span>
            <span>Status</span>
            <span>Progress</span>
            <span>Cost</span>
            <span>Start</span>
            <span>Target</span>
            <span>Lead</span>
          </div>
          <div>
            {filtered.map(project => {
              const pct =
                project.taskCount > 0
                  ? Math.round((project.doneTaskCount / project.taskCount) * 100)
                  : 0
              return (
                <Link
                  key={project.id}
                  href={`/admin/ops/projects/${project.id}`}
                  className="ops-projects-grid ops-projects-row"
                >
                  <div className="ops-projects-cell min-w-0" data-label="Project">
                    <p className="ops-projects-name">{project.name}</p>
                    {project.financialOfferId ? (
                      <p className="dash-meta">From offer</p>
                    ) : null}
                  </div>
                  <div className="ops-projects-cell" data-label="Client">
                    {project.isInternal ? (
                      <span className="ops-projects-internal-badge">Internal</span>
                    ) : (
                      <span>{project.clientName ?? '—'}</span>
                    )}
                  </div>
                  <div className="ops-projects-cell" data-label="Status">
                    <span className={`ops-projects-status ops-projects-status--${project.status}`}>
                      {STATUS_LABELS[project.status]}
                    </span>
                  </div>
                  <div className="ops-projects-cell" data-label="Progress">
                    <span className="tabular-nums">
                      {project.doneTaskCount}/{project.taskCount}
                    </span>
                    <span className="dash-meta ml-2">{pct}%</span>
                  </div>
                  <div className="ops-projects-cell tabular-nums" data-label="Cost">
                    {formatProjectCost(project.costAmount)}
                  </div>
                  <div className="ops-projects-cell tabular-nums" data-label="Start">
                    <time dateTime={project.startDate ?? undefined}>{formatProjectDate(project.startDate)}</time>
                  </div>
                  <div className="ops-projects-cell tabular-nums" data-label="Target">
                    <time dateTime={project.targetDate ?? undefined}>{formatProjectDate(project.targetDate)}</time>
                  </div>
                  <div className="ops-projects-cell" data-label="Lead">
                    <span className="dash-meta">{project.leadName ?? '—'}</span>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
