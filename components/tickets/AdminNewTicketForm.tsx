'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { createTicket } from '@/app/actions/tickets'
import { DashCancel } from '@/components/dashboard/DashCancel'
import { runWithToast } from '@/lib/notify'

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
  const [pending, startTransition] = useTransition()
  const [noHours, setNoHours] = useState(false)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const id = await runWithToast(() => createTicket(formData), {
        loading: 'Creating ticket…',
        success: 'Ticket created',
      })
      if (!id) return
      router.push(`/admin/tickets/${id}`)
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="dash-label">
          Client <span className="dash-label-required">*</span>
        </label>
        <select
          name="client_id"
          required
          className="dash-select w-full text-sm"
          defaultValue={defaultClientId ?? ''}
          disabled={pending}
        >
          <option value="">Select client…</option>
          {clients.map(c => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
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
          disabled={pending}
        />
      </div>
      {staff.length > 0 ? (
        <div>
          <label className="dash-label">Assign to</label>
          <select name="assigned_to" className="dash-select w-full text-sm" defaultValue="" disabled={pending}>
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
          disabled={pending}
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
            <select name="type" defaultValue="task" className="dash-select w-full text-sm" disabled={pending}>
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
            disabled={pending}
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
            disabled={pending}
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
          disabled={pending}
        />
      </div>
      <div className="flex flex-wrap gap-3 pt-1">
        <button type="submit" className="dash-btn-primary btn-primary cursor-pointer" disabled={pending}>
          {pending ? 'Creating…' : 'Create ticket'}
        </button>
        <DashCancel href="/admin/tickets" />
      </div>
    </form>
  )
}
