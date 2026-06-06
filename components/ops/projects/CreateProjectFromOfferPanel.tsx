'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createProjectFromOffer } from '@/app/actions/projects'
import { PROJECT_TEMPLATES } from '@/lib/ops/projects/templates'
import type { ProjectTemplateKey } from '@/lib/ops/projects/types'
import { useModalDialog } from '@/lib/ui/use-modal-dialog'
import { runWithToast } from '@/lib/notify'

export function CreateProjectFromOfferPanel({
  offerId,
  clientName,
  open,
  onClose,
}: {
  offerId: string
  clientName: string
  open: boolean
  onClose: () => void
}) {
  const router = useRouter()
  const dialogRef = useModalDialog(open, onClose)
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
    <dialog ref={dialogRef} className="ticket-modal ticket-modal--ops-form">
      {open ? (
        <div className="ticket-modal-inner ops-offer-project-modal">
          <h2 className="ticket-modal-title">Create project</h2>
          <p className="ticket-modal-sub">
            One project per accepted offer for <strong>{clientName}</strong>. Pick a template to
            pre-fill phases and tasks.
          </p>
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
          <div className="ticket-modal-actions">
            <button
              type="button"
              className="dash-btn-secondary cursor-pointer"
              onClick={onClose}
              disabled={pending}
            >
              Cancel
            </button>
            <button
              type="button"
              className="dash-btn-primary btn-primary"
              onClick={handleCreate}
              disabled={pending}
            >
              {pending ? 'Creating…' : 'Create project'}
            </button>
          </div>
        </div>
      ) : null}
    </dialog>
  )
}
