'use client'

import Link from 'next/link'
import { ProjectFilePanel } from '@/components/ops/projects/ProjectFilePanel'
import { flattenProjectTasks } from '@/lib/ops/projects/find-task'
import {
  formatProjectCost,
  formatProjectDate,
} from '@/lib/ops/projects/display'
import { phaseToneRowClass } from '@/lib/ops/projects/phase-tone'
import { getProjectTemplate } from '@/lib/ops/projects/templates'
import {
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  type OpsProjectDetail,
  type ProjectStatus,
} from '@/lib/ops/projects/types'

const STATUS_LABELS: Record<ProjectStatus, string> = {
  active: 'Active',
  on_hold: 'On hold',
  completed: 'Completed',
  archived: 'Archived',
}

const PHASE_STATUS_LABELS = {
  pending: 'Pending',
  in_progress: 'In progress',
  done: 'Done',
} as const

export function ProjectOverview({ project }: { project: OpsProjectDetail }) {
  const allTasks = flattenProjectTasks(project.tasks)
  const pct =
    project.taskCount > 0 ? Math.round((project.doneTaskCount / project.taskCount) * 100) : 0
  const template = project.templateKey ? getProjectTemplate(project.templateKey) : null
  const overdueTasks = allTasks.filter(
    task => task.dueDate && task.status !== 'done' && task.dueDate < new Date().toISOString().slice(0, 10)
  ).length
  const unassignedTasks = allTasks.filter(task => !task.assigneeId && task.status !== 'done').length

  const phaseRows = project.phases.map(phase => {
    const phaseTasks = allTasks.filter(task => task.phaseId === phase.id)
    const done = phaseTasks.filter(task => task.status === 'done').length
    const total = phaseTasks.length
    const phasePct = total > 0 ? Math.round((done / total) * 100) : 0
    return { phase, done, total, phasePct }
  })

  const unphasedTasks = allTasks.filter(task => !task.phaseId)
  const unphasedDone = unphasedTasks.filter(task => task.status === 'done').length

  return (
    <div className="ops-project-overview">
      <div className="ops-project-overview-grid">
        <section className="ops-project-overview-card ops-project-overview-card--wide">
          <h2 className="ops-project-overview-card-title">Summary</h2>
          {project.description ? (
            <p className="ops-project-overview-description">{project.description}</p>
          ) : (
            <p className="ops-project-overview-empty">No project description yet.</p>
          )}
          <dl className="ops-project-overview-stats">
            <div>
              <dt>Status</dt>
              <dd>
                <span className={`ops-project-status-pill ops-project-status-pill--${project.status}`}>
                  {STATUS_LABELS[project.status]}
                </span>
              </dd>
            </div>
            <div>
              <dt>Progress</dt>
              <dd className="tabular-nums ops-progress-pct">
                {pct}% <span className="ops-progress-copy">({project.doneTaskCount}/{project.taskCount})</span>
              </dd>
            </div>
            <div>
              <dt>Cost</dt>
              <dd className="tabular-nums">{formatProjectCost(project.costAmount)}</dd>
            </div>
            <div>
              <dt>Start</dt>
              <dd className="tabular-nums">{formatProjectDate(project.startDate)}</dd>
            </div>
            <div>
              <dt>Target</dt>
              <dd className="tabular-nums">{formatProjectDate(project.targetDate)}</dd>
            </div>
            <div>
              <dt>Lead</dt>
              <dd>{project.leadName ?? '—'}</dd>
            </div>
          </dl>
        </section>

        <section className="ops-project-overview-card">
          <h2 className="ops-project-overview-card-title">Client & links</h2>
          <dl className="ops-project-overview-links">
            <div>
              <dt>Client</dt>
              <dd>
                {project.isInternal ? (
                  <span className="ops-projects-internal-badge">Internal</span>
                ) : (
                  project.clientName ?? '—'
                )}
              </dd>
            </div>
            {template ? (
              <div>
                <dt>Template</dt>
                <dd>{template.label}</dd>
              </div>
            ) : null}
            {project.financialOfferId ? (
              <div>
                <dt>Financial offer</dt>
                <dd>
                  <Link
                    href={`/admin/ops/financial-offers/${project.financialOfferId}`}
                    className="ops-project-overview-link"
                  >
                    View linked offer
                  </Link>
                </dd>
              </div>
            ) : null}
          </dl>
        </section>

        <section className="ops-project-overview-card">
          <h2 className="ops-project-overview-card-title">Task health</h2>
          <div className="ops-project-overview-health">
            <div className="ops-project-overview-health-alerts">
              <div
                className={`ops-project-overview-health-alert${overdueTasks > 0 ? ' ops-project-overview-health-alert--hot' : ''}`}
              >
                <span className="ops-project-overview-health-alert-label">Overdue</span>
                <span className="ops-project-overview-health-alert-value tabular-nums">{overdueTasks}</span>
              </div>
              <div
                className={`ops-project-overview-health-alert${unassignedTasks > 0 ? ' ops-project-overview-health-alert--warn' : ''}`}
              >
                <span className="ops-project-overview-health-alert-label">Unassigned open</span>
                <span className="ops-project-overview-health-alert-value tabular-nums">{unassignedTasks}</span>
              </div>
            </div>
            <div className="ops-project-overview-health-breakdown">
              <p className="ops-project-overview-health-breakdown-title">By status</p>
              <div className="ops-project-overview-status-grid">
                {TASK_STATUSES.map(status => {
                  const count = allTasks.filter(task => task.status === status).length
                  return (
                    <div
                      key={status}
                      className={`ops-project-overview-status ops-project-overview-status--${status}`}
                    >
                      <span className="ops-project-overview-status-label">{TASK_STATUS_LABELS[status]}</span>
                      <span className="ops-project-overview-status-count tabular-nums">{count}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="ops-project-overview-card ops-project-overview-card--wide">
          <ProjectFilePanel
            projectId={project.id}
            title="Project files"
            emptyLabel="No project-level files yet. Upload briefs, contracts, or brand assets."
          />
        </section>

        <section className="ops-project-overview-card ops-project-overview-card--wide">
          <h2 className="ops-project-overview-card-title">Phases</h2>
          {phaseRows.length > 0 ? (
            <ul className="ops-project-overview-phases">
              {phaseRows.map(({ phase, done, total, phasePct }, index) => (
                <li key={phase.id} className="ops-project-overview-phase">
                  <div className={`ops-project-overview-phase-head ${phaseToneRowClass(index)}`}>
                    <span className="ops-project-overview-phase-name">{phase.name}</span>
                    <span className="ops-project-overview-phase-meta tabular-nums">
                      {done}/{total} · {phasePct}%
                    </span>
                    <span className={`ops-project-overview-phase-status ops-project-overview-phase-status--${phase.status}`}>
                      {PHASE_STATUS_LABELS[phase.status]}
                    </span>
                  </div>
                  <div className="ops-project-overview-phase-bar" aria-hidden>
                    <div
                      className="ops-project-overview-phase-fill"
                      style={{ width: `${phasePct}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="ops-project-overview-empty">No phases in this project.</p>
          )}
          {unphasedTasks.length > 0 ? (
            <p className="ops-project-overview-unphased dash-meta">
              {unphasedDone}/{unphasedTasks.length} tasks without a phase
            </p>
          ) : null}
        </section>
      </div>
    </div>
  )
}
