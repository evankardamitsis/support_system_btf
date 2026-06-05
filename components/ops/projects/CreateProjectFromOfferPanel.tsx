'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createProjectFromOffer } from '@/app/actions/projects'
import { PROJECT_TEMPLATES } from '@/lib/ops/projects/templates'
import type { ProjectTemplateKey } from '@/lib/ops/projects/types'
import { runWithToast } from '@/lib/notify'

export function CreateProjectFromOfferPanel({
  offerId,
  clientName,
  onClose,
}: {
  offerId: string
  clientName: string
  onClose: () => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [templateKey, setTemplateKey] = useState<ProjectTemplateKey>('blank')

  function handleCreate() {
    startTransition(async () => {
      const id = await runWithToast(() => createProjectFromOffer(offerId, templateKey), {
        loading: 'Creating project…',
        success: 'Project created from offer',
      })
      if (!id) return
      onClose()
      router.push(`/admin/ops/projects/${id}`)
    })
  }

  return (
    <div className="ops-offer-project-panel">
      <p className="ops-offer-project-panel-title">
        Create project for <strong>{clientName}</strong>
      </p>
      <p className="dash-meta mb-3">One project per accepted offer. Pick a template to pre-fill phases and tasks.</p>
      <div className="ops-project-templates ops-project-templates--compact">
        {PROJECT_TEMPLATES.map(template => (
          <label
            key={template.key}
            className={`ops-project-template ops-project-template--compact${
              templateKey === template.key ? ' ops-project-template--active' : ''
            }`}
          >
            <input
              type="radio"
              checked={templateKey === template.key}
              onChange={() => setTemplateKey(template.key)}
              className="sr-only"
              disabled={pending}
            />
            <span className="ops-project-template-label">{template.label}</span>
          </label>
        ))}
      </div>
      <div className="flex gap-2 mt-4">
        <button
          type="button"
          className="dash-btn-primary btn-primary"
          onClick={handleCreate}
          disabled={pending}
        >
          Create project
        </button>
        <button type="button" className="dash-btn-ghost" onClick={onClose} disabled={pending}>
          Cancel
        </button>
      </div>
    </div>
  )
}
