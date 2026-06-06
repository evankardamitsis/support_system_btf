'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createProject } from '@/app/actions/projects'
import {
  ClientSelectWithCreate,
  type ClientOption,
} from '@/components/clients/ClientSelectWithCreate'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { FormPanel } from '@/components/dashboard/FormPanel'
import { DashCancel } from '@/components/dashboard/DashCancel'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import { parseProjectCostInput } from '@/lib/ops/projects/display'
import { PROJECT_TEMPLATES } from '@/lib/ops/projects/templates'
import type { ProjectTemplateKey } from '@/lib/ops/projects/types'
import { notifyError, runWithToast } from '@/lib/notify'

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
  const [clientId, setClientId] = useState('')
  const [leadId, setLeadId] = useState('')

  const staffOptions = useMemo(
    () => staff.map(member => ({ value: member.id, label: member.name })),
    [staff]
  )

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const name = String(form.get('name') ?? '')
    const resolvedClientId = isInternal ? null : clientId || null
    const resolvedLeadId = leadId || null
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
            clientId: resolvedClientId,
            templateKey,
            leadId: resolvedLeadId,
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
              <ClientSelectWithCreate
                clients={clients}
                value={clientId}
                onChange={setClientId}
                disabled={pending}
                selectId="project-client"
                required={false}
                placeholder="No client linked"
              />
            ) : null}

            <SearchableSelect
              id="project-lead"
              label="Project lead"
              options={staffOptions}
              value={leadId}
              onChange={setLeadId}
              placeholder="Unassigned"
              searchPlaceholder="Search team…"
              allowEmpty
              emptyOptionLabel="Unassigned"
              disabled={pending}
            />

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
