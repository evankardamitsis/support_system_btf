'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createPortalTicket } from '@/app/actions/tickets'
import { uploadTicketAttachment } from '@/app/actions/ticket-attachments'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { DashCancel } from '@/components/dashboard/DashCancel'
import { TicketDescriptionEditor } from '@/components/tickets/TicketDescriptionEditor'
import { runWithToast } from '@/lib/notify'

const typeOptions = ['BUG', 'TASK', 'REQUEST', 'QUESTION']
const typeMap: Record<string, string> = {
  BUG: 'bug',
  TASK: 'task',
  REQUEST: 'request',
  QUESTION: 'question',
}

const MAX_IMAGES = 5
const MAX_BYTES = 10 * 1024 * 1024

export function NewTicketForm() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [type, setType] = useState('TASK')
  const [pending, startTransition] = useTransition()
  const [images, setImages] = useState<File[]>([])

  function addImages(files: FileList | null) {
    if (!files) return
    const next = [...images]
    for (const f of Array.from(files)) {
      if (!f.type.startsWith('image/')) continue
      if (f.size > MAX_BYTES) continue
      if (next.length >= MAX_IMAGES) break
      next.push(f)
    }
    setImages(next)
  }

  function removeImage(index: number) {
    setImages(imgs => imgs.filter((_, i) => i !== index))
  }

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

      for (const file of images) {
        const fd = new FormData()
        fd.set('file', file)
        await uploadTicketAttachment(id, null, fd)
      }

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
          <TicketDescriptionEditor disabled={pending} minHeight={160} />
        </div>

        <div>
          <label className="dash-label">Attachments</label>
          <label className="ticket-comment-attach-btn ticket-comment-attach-btn--block" aria-label="Attach images">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              disabled={pending}
              onChange={e => addImages(e.target.files)}
            />
            <AttachIcon />
            <span>Add images</span>
          </label>
          {images.length > 0 ? (
            <div className="ticket-comment-form-previews" style={{ marginTop: '0.75rem' }}>
              {images.map((f, i) => (
                <div key={i} className="ticket-comment-form-preview">
                  <img
                    src={URL.createObjectURL(f)}
                    alt={f.name}
                    className="ticket-comment-form-preview-img"
                  />
                  <button
                    type="button"
                    className="ticket-comment-form-preview-remove"
                    onClick={() => removeImage(i)}
                    aria-label={`Remove ${f.name}`}
                    disabled={pending}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          ) : null}
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

function AttachIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  )
}
