'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createProject } from '@/app/actions/projects'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { FormPanel } from '@/components/dashboard/FormPanel'
import { DashCancel } from '@/components/dashboard/DashCancel'
import { parseProjectCostInput } from '@/lib/ops/projects/display'
import { PROJECT_TEMPLATES } from '@/lib/ops/projects/templates'
import type { ProjectTemplateKey } from '@/lib/ops/projects/types'
import { notifyError, runWithToast } from '@/lib/notify'

type ClientOption = { id: string; name: string }
type StaffOption = { id: string; name: string }

export function NewProjectForm({
  clients,
  staff,
}: {
  clients: ClientOption[]
  staff: StaffOption[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [isInternal, setIsInternal] = useState(false)
  const [templateKey, setTemplateKey] = useState<ProjectTemplateKey>('blank')

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const name = String(form.get('name') ?? '')
    const clientId = isInternal ? null : String(form.get('clientId') ?? '') || null
    const leadId = String(form.get('leadId') ?? '') || null
    const description = String(form.get('description') ?? '') || null
    const startDate = String(form.get('startDate') ?? '') || null
    const targetDate = String(form.get('targetDate') ?? '') || null
    const costRaw = String(form.get('costAmount') ?? '')

    startTransition(async () => {
      let costAmount: number | null = null
      try {
        costAmount = parseProjectCostInput(costRaw)
      } catch (err) {
        notifyError(err instanceof Error ? err.message : 'Invalid project cost')
        return
      }

      const id = await runWithToast(
        () =>
          createProject({
            name,
            isInternal,
            clientId,
            templateKey,
            leadId,
            description,
            startDate,
            targetDate,
            costAmount,
          }),
        { loading: 'Creating project…', success: 'Project created' }
      )
      if (!id) return
      router.push(`/admin/ops/projects/${id}`)
    })
  }

  return (
    <div className="w-full max-w-2xl space-y-6">
      <Link href="/admin/ops/projects" className="dash-back">
        ← Back to projects
      </Link>

      <PageHeader
        title="New project"
        description="Pick a template or start blank. Link to a client or mark as internal."
      />

      <form onSubmit={handleSubmit} className="space-y-5">
        <FormPanel title="Template">
          <div className="ops-project-templates">
            {PROJECT_TEMPLATES.map(template => (
              <label
                key={template.key}
                className={`ops-project-template${templateKey === template.key ? ' ops-project-template--active' : ''}`}
              >
                <input
                  type="radio"
                  name="template"
                  value={template.key}
                  checked={templateKey === template.key}
                  onChange={() => setTemplateKey(template.key)}
                  className="sr-only"
                  disabled={pending}
                />
                <span className="ops-project-template-label">{template.label}</span>
                <span className="ops-project-template-desc">{template.description}</span>
                {template.phases.length > 0 ? (
                  <span className="dash-meta">
                    {template.phases.length} phases ·{' '}
                    {template.phases.reduce((n, p) => n + p.tasks.length, 0)} tasks
                  </span>
                ) : null}
              </label>
            ))}
          </div>
        </FormPanel>

        <FormPanel title="Details">
          <div className="flex flex-col gap-4">
            <div>
              <label className="dash-label">
                Project name <span className="dash-label-required">*</span>
              </label>
              <input
                name="name"
                required
                className="btf-input w-full"
                placeholder="Acme e-shop rebuild"
                disabled={pending}
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isInternal}
                onChange={e => setIsInternal(e.target.checked)}
                disabled={pending}
              />
              <span className="text-sm text-[var(--text-2)]">Internal project (no client)</span>
            </label>

            {!isInternal ? (
              <div>
                <label className="dash-label">Client</label>
                <select name="clientId" className="btf-input w-full" disabled={pending}>
                  <option value="">No client linked</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div>
              <label className="dash-label">Project lead</label>
              <select name="leadId" className="btf-input w-full" disabled={pending}>
                <option value="">Unassigned</option>
                {staff.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="dash-label">Description</label>
              <textarea
                name="description"
                rows={3}
                className="btf-input w-full resize-y"
                disabled={pending}
              />
            </div>

            <div>
              <label className="dash-label">Project cost (EUR)</label>
              <input
                type="text"
                name="costAmount"
                inputMode="decimal"
                className="btf-input w-full"
                placeholder="e.g. 4500"
                disabled={pending}
              />
              <p className="dash-meta mt-1">Optional. Set manually or leave blank.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="dash-label">Start date</label>
                <input type="date" name="startDate" className="btf-input w-full" disabled={pending} />
              </div>
              <div>
                <label className="dash-label">Target date</label>
                <input type="date" name="targetDate" className="btf-input w-full" disabled={pending} />
              </div>
            </div>
          </div>
        </FormPanel>

        <div className="flex gap-3">
          <button type="submit" className="dash-btn-primary btn-primary" disabled={pending}>
            Create project
          </button>
          <DashCancel href="/admin/ops/projects" />
        </div>
      </form>
    </div>
  )
}
