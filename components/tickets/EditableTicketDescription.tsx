'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { updateTicketDescription } from '@/app/actions/tickets'
import { TicketDescriptionEditor } from '@/components/tickets/TicketDescriptionEditor'
import { FormattedTicketDescription } from '@/components/tickets/FormattedTicketDescription'
import { isEmptyTicketDescription } from '@/lib/tickets/description-format'
import { runWithToast } from '@/lib/notify'

export function EditableTicketDescription({
  ticketId,
  description,
  editable,
}: {
  ticketId: string
  description: string | null
  editable: boolean
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [pending, startTransition] = useTransition()

  const hasContent = Boolean(description && !isEmptyTicketDescription(description))

  if (!editable) {
    if (!hasContent) return null
    return (
      <section className="ticket-detail-brief anim-fade-up anim-fade-up-2">
        <h2 className="ticket-detail-brief-label">Request</h2>
        <FormattedTicketDescription
          content={description!}
          className="ticket-detail-brief-body"
        />
      </section>
    )
  }

  if (!editing) {
    return (
      <section className="ticket-detail-brief anim-fade-up anim-fade-up-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="ticket-detail-brief-label">Request</h2>
          <button
            type="button"
            className="dash-link-accent text-sm"
            onClick={() => setEditing(true)}
          >
            {hasContent ? 'Edit description' : 'Add description'}
          </button>
        </div>
        {hasContent ? (
          <FormattedTicketDescription
            content={description!}
            className="ticket-detail-brief-body"
          />
        ) : (
          <p className="dash-meta">No description yet.</p>
        )}
      </section>
    )
  }

  return (
    <section className="ticket-detail-brief anim-fade-up anim-fade-up-2">
      <h2 className="ticket-detail-brief-label">Request</h2>
      <form
        className="space-y-3"
        onSubmit={event => {
          event.preventDefault()
          const formData = new FormData(event.currentTarget)
          const next = (formData.get('description') as string | null) ?? ''

          startTransition(async () => {
            const ok = await runWithToast(() => updateTicketDescription(ticketId, next), {
              loading: 'Saving description…',
              success: 'Description updated',
            })
            if (ok === null) return
            setEditing(false)
            router.refresh()
          })
        }}
      >
        <TicketDescriptionEditor
          name="description"
          defaultValue={description}
          disabled={pending}
          minHeight={160}
        />
        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            className="dash-btn-primary btn-primary cursor-pointer"
            disabled={pending}
          >
            {pending ? 'Saving…' : 'Save description'}
          </button>
          <button
            type="button"
            className="dash-btn-ghost"
            disabled={pending}
            onClick={() => setEditing(false)}
          >
            Cancel
          </button>
        </div>
      </form>
    </section>
  )
}
