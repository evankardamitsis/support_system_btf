'use client'

import { useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { addComment } from '@/app/actions/comments'
import { runWithToast } from '@/lib/notify'

export function TicketCommentForm({
  ticketId,
  variant,
}: {
  ticketId: string
  variant: 'admin' | 'portal'
}) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [pending, startTransition] = useTransition()

  function submit(isInternal: boolean) {
    const form = formRef.current
    if (!form) return
    const body = (new FormData(form).get('body') as string)?.trim()
    if (!body) return
    startTransition(async () => {
      const ok = await runWithToast(
        () => addComment(ticketId, body, isInternal),
        {
          loading: 'Posting…',
          success:
            variant === 'portal'
              ? 'Reply sent to BTF'
              : isInternal
                ? 'Internal note added'
                : 'Reply sent to client',
        }
      )
      if (ok === null) return
      form.reset()
      router.refresh()
    })
  }

  if (variant === 'portal') {
    return (
      <form
        ref={formRef}
        className="flex flex-col gap-3 pt-4"
        onSubmit={e => {
          e.preventDefault()
          submit(false)
        }}
      >
        <textarea
          name="body"
          required
          rows={4}
          placeholder="Write a reply…"
          className="btf-input w-full resize-y"
          style={{ minHeight: 96 }}
          disabled={pending}
        />
        <button
          type="submit"
          className="dash-btn-primary btn-primary self-start cursor-pointer"
          disabled={pending}
        >
          {pending ? 'Sending…' : 'Send reply'}
        </button>
      </form>
    )
  }

  return (
    <form ref={formRef} className="ticket-detail-reply-form" onSubmit={e => e.preventDefault()}>
      <textarea
        name="body"
        required
        rows={4}
        placeholder="Write a reply or internal note…"
        className="btf-input w-full resize-y"
        disabled={pending}
      />
      <div className="ticket-detail-reply-actions">
        <button
          type="button"
          className="dash-btn-primary btn-primary cursor-pointer"
          disabled={pending}
          onClick={() => submit(false)}
        >
          {pending ? 'Posting…' : 'Reply to client'}
        </button>
        <button
          type="button"
          className="dash-btn-secondary cursor-pointer"
          disabled={pending}
          onClick={() => submit(true)}
        >
          Internal note
        </button>
      </div>
    </form>
  )
}
