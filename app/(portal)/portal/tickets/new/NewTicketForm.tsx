'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createPortalTicket } from '@/app/actions/tickets'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { DashCancel } from '@/components/dashboard/DashCancel'
import { runWithToast } from '@/lib/notify'

const typeOptions = ['BUG', 'TASK', 'REQUEST', 'QUESTION']
const typeMap: Record<string, string> = {
  BUG: 'bug',
  TASK: 'task',
  REQUEST: 'request',
  QUESTION: 'question',
}

export function NewTicketForm() {
  const router = useRouter()
  const [type, setType] = useState('TASK')
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    formData.set('type', typeMap[type] ?? 'task')

    startTransition(async () => {
      const id = await runWithToast(() => createPortalTicket(formData), {
        loading: 'Submitting request…',
        success: 'Request submitted — BTF will pick it up shortly',
      })
      if (!id) return
      router.push(`/portal/tickets/${id}`)
      router.refresh()
    })
  }

  return (
    <div className="dash-panel">
      <form onSubmit={handleSubmit} className="dash-form-body">
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
            disabled={pending}
          />
        </div>

        <div className="flex flex-wrap gap-3 pt-1">
          <button type="submit" className="dash-btn-primary btn-primary cursor-pointer" disabled={pending}>
            {pending ? 'Submitting…' : 'Submit ticket'}
          </button>
          <DashCancel href="/portal/tickets" />
        </div>
      </form>
    </div>
  )
}
