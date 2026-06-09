'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { createTicket } from '@/app/actions/tickets'
import { DashCancel } from '@/components/dashboard/DashCancel'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import { notifyError, runWithToast } from '@/lib/notify'

import type { AssigneeOption } from './EditableAssigneeSelect'

export function AdminNewTicketForm({
  clients,
  staff = [],
  defaultClientId,
}: {
  clients: Array<{ id: string; name: string }>
  staff?: AssigneeOption[]
  defaultClientId?: string
}) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [noHours, setNoHours] = useState(false)
  const [clientId, setClientId] = useState(defaultClientId ?? '')

  const clientOptions = useMemo(
    () =>
      [...clients]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(client => ({ value: client.id, label: client.name })),
    [clients]
  )

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (submitting) return
    if (!clientId) {
      notifyError('Please select a client')
      return
    }

    const formData = new FormData(e.currentTarget)
    formData.set('client_id', clientId)
    setSubmitting(true)

    void (async () => {
      try {
        const id = await runWithToast(() => createTicket(formData), {
          loading: 'Creating ticket…',
          success: 'Ticket created',
        })
        if (!id) return
        router.push('/admin/tickets')
        router.refresh()
      } finally {
        setSubmitting(false)
      }
    })()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="dash-label" htmlFor="ticket-client">
          Client <span className="dash-label-required">*</span>
        </label>
        <SearchableSelect
          id="ticket-client"
          options={clientOptions}
          value={clientId}
          onChange={setClientId}
          placeholder="Select client…"
          searchPlaceholder="Search clients…"
          disabled={submitting}
          required
        />
      </div>
      <div>
        <label className="dash-label">
          Subject <span className="dash-label-required">*</span>
        </label>
        <input
          name="title"
          required
          className="btf-input w-full"
          placeholder="Brief description of the issue"
          disabled={submitting}
        />
      </div>
      {staff.length > 0 ? (
        <div>
          <label className="dash-label">Assign to</label>
          <select name="assigned_to" className="dash-select w-full text-sm" defaultValue="" disabled={submitting}>
            <option value="">Unassigned</option>
            {staff.map(member => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
          <p className="dash-meta mt-1">Teammate is notified by email when assigned.</p>
        </div>
      ) : null}
      <label className="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={noHours}
          onChange={event => setNoHours(event.target.checked)}
          disabled={submitting}
          className="mt-0.5"
        />
        <span className="text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>
          <span className="text-(--text-1) font-medium">No hours</span> — pre-existing bug (skips
          estimate, approvals, and retainer billing)
        </span>
      </label>
      <input type="hidden" name="no_hours" value={noHours ? 'true' : 'false'} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <label className="dash-label">Type</label>
          {noHours ? (
            <>
              <input type="hidden" name="type" value="bug" />
              <div className="btf-input w-full text-sm opacity-70" aria-disabled>
                Bug
              </div>
            </>
          ) : (
            <select name="type" defaultValue="task" className="dash-select w-full text-sm" disabled={submitting}>
              <option value="task">Task</option>
              <option value="bug">Bug</option>
              <option value="request">Request</option>
              <option value="question">Question</option>
            </select>
          )}
        </div>
        <div>
          <label className="dash-label">Priority</label>
          <select
            name="priority"
            defaultValue="normal"
            className="dash-select w-full text-sm"
            disabled={submitting}
          >
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      </div>
      {!noHours ? (
        <div>
          <label className="dash-label">Estimated hours</label>
          <input
            name="estimated_hours"
            type="number"
            step="0.25"
            min="0"
            className="btf-input w-full tabular-nums"
            placeholder="Optional plan / quote"
            disabled={submitting}
          />
        </div>
      ) : null}
      <div>
        <label className="dash-label">Description</label>
        <textarea
          name="description"
          rows={5}
          className="btf-input w-full resize-y"
          style={{ minHeight: 100 }}
          placeholder="Provide as much detail as possible…"
          disabled={submitting}
        />
      </div>
      <div className="flex flex-wrap gap-3 pt-1">
        <button type="submit" className="dash-btn-primary btn-primary cursor-pointer" disabled={submitting}>
          {submitting ? 'Creating…' : 'Create ticket'}
        </button>
        <DashCancel href="/admin/tickets" />
      </div>
    </form>
  )
}
