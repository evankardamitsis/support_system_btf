'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { addComment } from '@/app/actions/comments'
import { uploadTicketAttachment } from '@/app/actions/ticket-attachments'
import { MentionTextarea } from '@/components/tickets/MentionTextarea'
import { runWithToast } from '@/lib/notify'

const MAX_IMAGES = 5
const MAX_BYTES = 10 * 1024 * 1024

export function TicketCommentForm({
  ticketId,
  variant,
  staffForMentions = [],
}: {
  ticketId: string
  variant: 'admin' | 'portal'
  staffForMentions?: { id: string; name: string }[]
}) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pending, startTransition] = useTransition()
  const [composerKey, setComposerKey] = useState(0)
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

  function submit(isInternal: boolean) {
    const form = formRef.current
    if (!form) return
    const body = (new FormData(form).get('body') as string)?.trim()
    if (!body) return
    startTransition(async () => {
      const commentId = await runWithToast(
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
      if (commentId === null) return

      for (const file of images) {
        const fd = new FormData()
        fd.set('file', file)
        await uploadTicketAttachment(ticketId, commentId, fd)
      }

      form.reset()
      setImages([])
      setComposerKey(k => k + 1)
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
        {images.length > 0 ? (
          <div className="ticket-comment-form-previews">
            {images.map((f, i) => (
              <div key={i} className="ticket-comment-form-preview">
                <img src={URL.createObjectURL(f)} alt={f.name} className="ticket-comment-form-preview-img" />
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
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="submit"
            className="dash-btn-primary btn-primary cursor-pointer"
            disabled={pending}
          >
            {pending ? 'Sending…' : 'Send reply'}
          </button>
          {images.length < MAX_IMAGES ? (
            <label className="ticket-comment-attach-btn" aria-label="Attach image">
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
              <span>Attach image</span>
            </label>
          ) : null}
        </div>
      </form>
    )
  }

  return (
    <form ref={formRef} className="ticket-detail-reply-form" onSubmit={e => e.preventDefault()}>
      <MentionTextarea
        resetKey={composerKey}
        staff={staffForMentions}
        disabled={pending}
        placeholder="Write a reply or internal note… Use @name to tag teammates in internal notes."
      />
      {images.length > 0 ? (
        <div className="ticket-comment-form-previews">
          {images.map((f, i) => (
            <div key={i} className="ticket-comment-form-preview">
              <img src={URL.createObjectURL(f)} alt={f.name} className="ticket-comment-form-preview-img" />
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
        {images.length < MAX_IMAGES ? (
          <label className="ticket-comment-attach-btn" aria-label="Attach image">
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
          </label>
        ) : null}
      </div>
    </form>
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
