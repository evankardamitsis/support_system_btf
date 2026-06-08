'use client'

import { useEffect, useState, useTransition } from 'react'
import { useModalDialog } from '@/lib/ui/use-modal-dialog'
import { createPhase } from '@/app/actions/projects'
import type { OpsProjectDetail } from '@/lib/ops/projects/types'
import { runWithToast } from '@/lib/notify'

export function ProjectAddPhasePanel({
  open,
  onClose,
  project,
  onRefresh,
}: {
  open: boolean
  onClose: () => void
  project: OpsProjectDetail
  onRefresh: () => void
}) {
  const dialogRef = useModalDialog(open, onClose)
  const [pending, startTransition] = useTransition()
  const [name, setName] = useState('')

  useEffect(() => {
    if (open) return
    setName('')
  }, [open])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    startTransition(async () => {
      const ok = await runWithToast(() => createPhase(project.id, name), {
        loading: 'Adding phase…',
        success: 'Phase added',
      })
      if (ok === null) return
      onClose()
      onRefresh()
    })
  }

  return (
    <dialog ref={dialogRef} className="ticket-modal ticket-modal--ops-form">
      {open ? (
        <div className="ticket-modal-inner">
          <h2 className="ticket-modal-title">Add phase</h2>
          <p className="ticket-modal-sub">Add a phase to {project.name}.</p>

          <form onSubmit={handleSubmit} className="ops-add-task-modal-form">
            <div>
              <label className="dash-label" htmlFor="ops-new-phase-name">
                Name <span className="dash-label-required">*</span>
              </label>
              <input
                id="ops-new-phase-name"
                className="btf-input w-full"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Phase name"
                disabled={pending}
                autoFocus
                required
              />
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
              <button type="submit" className="dash-btn-primary btn-primary" disabled={pending}>
                {pending ? 'Adding…' : 'Add phase'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </dialog>
  )
}
