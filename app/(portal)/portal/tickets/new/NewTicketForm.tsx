'use client'

import { useState } from 'react'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { DashCancel } from '@/components/dashboard/DashCancel'

const typeOptions = ['BUG', 'TASK', 'REQUEST', 'QUESTION']
const typeMap: Record<string, string> = {
  BUG: 'bug',
  TASK: 'task',
  REQUEST: 'request',
  QUESTION: 'question',
}

export function NewTicketForm({
  createTicket,
}: {
  createTicket: (formData: FormData) => Promise<void>
}) {
  const [type, setType] = useState('TASK')

  return (
    <div className="dash-panel">
      <form
        action={async formData => {
          formData.set('type', typeMap[type] ?? 'task')
          await createTicket(formData)
        }}
        className="dash-form-body"
      >
        <div>
          <label className="dash-label">
            Subject <span className="dash-label-required">*</span>
          </label>
          <input
            name="title"
            required
            className="btf-input w-full"
            placeholder="Brief description of the issue"
          />
        </div>

        <div>
          <label className="dash-label">Type</label>
          <SegmentedControl options={typeOptions} value={type} onChange={setType} />
        </div>

        <div>
          <label className="dash-label">Description</label>
          <textarea
            name="description"
            rows={6}
            className="btf-input w-full resize-y"
            placeholder="Provide as much detail as possible…"
            style={{ minHeight: 120 }}
          />
        </div>

        <div className="flex flex-wrap gap-3 pt-1">
          <button type="submit" className="dash-btn-primary btn-primary cursor-pointer">
            Submit ticket
          </button>
          <DashCancel href="/portal/tickets" />
        </div>
      </form>
    </div>
  )
}
