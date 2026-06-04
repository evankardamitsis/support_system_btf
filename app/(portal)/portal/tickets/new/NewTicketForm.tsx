'use client'

import { useState } from 'react'
import Link from 'next/link'
import { SegmentedControl } from '@/components/ui/SegmentedControl'

const typeOptions = ['BUG', 'TASK', 'REQUEST', 'QUESTION']
const typeMap: Record<string, string> = {
  BUG: 'bug', TASK: 'task', REQUEST: 'request', QUESTION: 'question',
}

const labelStyle = {
  fontFamily: 'var(--font-dm-mono)',
  color: 'var(--text-3)',
  fontSize: '10px',
  letterSpacing: '0.12em',
  textTransform: 'uppercase' as const,
  display: 'block' as const,
  marginBottom: 6,
}

export function NewTicketForm({
  createTicket,
}: {
  createTicket: (formData: FormData) => Promise<void>
}) {
  const [type, setType] = useState('TASK')

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <form
        action={async (formData) => {
          formData.set('type', typeMap[type] ?? 'task')
          await createTicket(formData)
        }}
        className="p-6 flex flex-col gap-5"
      >
        <div>
          <label style={labelStyle}>Subject *</label>
          <input
            name="title"
            required
            className="btf-input w-full px-3 py-2.5 text-sm"
            placeholder="Brief description of the issue"
          />
        </div>

        <div>
          <label style={labelStyle}>Type</label>
          <SegmentedControl options={typeOptions} value={type} onChange={setType} />
        </div>

        <div>
          <label style={labelStyle}>Description</label>
          <textarea
            name="description"
            rows={6}
            className="btf-input w-full px-3 py-2.5 text-sm resize-y"
            placeholder="Provide as much detail as possible…"
            style={{ minHeight: 120, fontFamily: 'var(--font-geist)' }}
          />
        </div>

        <div className="flex gap-3 pt-1">
          <button
            type="submit"
            className="btn-primary px-6 py-2.5 text-[11px] tracking-[0.15em] uppercase cursor-pointer"
            style={{
              fontFamily: 'var(--font-dm-mono)',
              background: 'var(--accent)',
              color: 'var(--bg)',
              border: 'none',
              borderRadius: 0,
            }}
          >
            SUBMIT TICKET →
          </button>
          <Link
            href="/portal/tickets"
            className="px-4 py-2.5 text-[11px] tracking-[0.12em] uppercase cursor-pointer inline-flex items-center"
            style={{
              fontFamily: 'var(--font-dm-mono)',
              color: 'var(--text-3)',
              border: '1px solid var(--border)',
            }}
          >
            CANCEL
          </Link>
        </div>
      </form>
    </div>
  )
}
