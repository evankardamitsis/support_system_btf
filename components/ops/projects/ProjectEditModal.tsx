'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { updateProject } from '@/app/actions/projects'
import {
  ClientSelectWithCreate,
  type ClientOption,
} from '@/components/clients/ClientSelectWithCreate'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import type { OpsProjectDetail } from '@/lib/ops/projects/types'
import { notifyError, runWithToast } from '@/lib/notify'
import { useModalDialog } from '@/lib/ui/use-modal-dialog'

type StaffOption = { id: string; name: string }

export function ProjectEditModal({
  open,
  onClose,
  project,
  clients,
  staff,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  project: OpsProjectDetail
  clients: ClientOption[]
  staff: StaffOption[]
  onSaved: () => void
}) {
  const dialogRef = useModalDialog(open, onClose)
  const [pending, startTransition] = useTransition()
  const [isInternal, setIsInternal] = useState(project.isInternal)
  const [clientId, setClientId] = useState(project.clientId ?? '')
  const [leadId, setLeadId] = useState(project.leadId ?? '')
  const [name, setName] = useState(project.name)
  const [description, setDescription] = useState(project.description ?? '')
  const [startDate, setStartDate] = useState(project.startDate ?? '')
  const [targetDate, setTargetDate] = useState(project.targetDate ?? '')

  const staffOptions = useMemo(
    () => staff.map(member => ({ value: member.id, label: member.name })),
    [staff]
  )

  useEffect(() => {
    if (!open) return
    setIsInternal(project.isInternal)
    setClientId(project.clientId ?? '')
    setLeadId(project.leadId ?? '')
    setName(project.name)
    setDescription(project.description ?? '')
    setStartDate(project.startDate ?? '')
    setTargetDate(project.targetDate ?? '')
  }, [open, project])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) {
      notifyError('Project name is required')
      return
    }

    startTransition(async () => {
      const ok = await runWithToast(
        () =>
          updateProject(project.id, {
            name: trimmedName,
            isInternal,
            clientId: isInternal ? null : clientId || null,
            leadId: leadId || null,
            description: description.trim() || null,
            startDate: startDate || null,
            targetDate: targetDate || null,
          }),
        { loading: 'Saving project…', success: 'Project updated' }
      )
      if (ok === null) return
      onClose()
      onSaved()
    })
  }

  return (
    <dialog ref={dialogRef} className="ticket-modal ops-project-edit-modal">
      {open ? (
        <form className="ticket-modal-inner ops-project-edit-form" onSubmit={handleSubmit}>
          <h2 className="ticket-modal-title">Edit project</h2>
          <p className="ticket-modal-sub">Update name, client, lead, and schedule.</p>

          <div className="ops-project-edit-fields">
            <div>
              <label className="dash-label" htmlFor="edit-project-name">
                Project name <span className="dash-label-required">*</span>
              </label>
              <input
                id="edit-project-name"
                required
                className="btf-input w-full"
                value={name}
                onChange={e => setName(e.target.value)}
                disabled={pending}
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isInternal}
                onChange={e => setIsInternal(e.target.checked)}
                disabled={pending || Boolean(project.financialOfferId)}
              />
              <span className="text-sm text-[var(--text-2)]">Internal project (no client)</span>
            </label>

            {!isInternal ? (
              <ClientSelectWithCreate
                clients={clients}
                value={clientId}
                onChange={setClientId}
                disabled={pending}
                selectId="edit-project-client"
                required={false}
                placeholder="No client linked"
              />
            ) : null}

            <SearchableSelect
              id="edit-project-lead"
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
              <label className="dash-label" htmlFor="edit-project-description">
                Description
              </label>
              <textarea
                id="edit-project-description"
                rows={3}
                className="btf-input w-full resize-y"
                value={description}
                onChange={e => setDescription(e.target.value)}
                disabled={pending}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="dash-label" htmlFor="edit-project-start">
                  Start date
                </label>
                <input
                  id="edit-project-start"
                  type="date"
                  className="btf-input w-full"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  disabled={pending}
                />
              </div>
              <div>
                <label className="dash-label" htmlFor="edit-project-target">
                  Target date
                </label>
                <input
                  id="edit-project-target"
                  type="date"
                  className="btf-input w-full"
                  value={targetDate}
                  onChange={e => setTargetDate(e.target.value)}
                  disabled={pending}
                />
              </div>
            </div>
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
              Save changes
            </button>
          </div>
        </form>
      ) : null}
    </dialog>
  )
}
