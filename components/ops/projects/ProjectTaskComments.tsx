'use client'

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { addTaskComment, listTaskComments } from '@/app/actions/project-attachments'
import { CommentThread } from '@/components/tickets/CommentThread'
import { MentionTextarea } from '@/components/tickets/MentionTextarea'
import type { OpsProjectTaskComment } from '@/lib/ops/projects/types'
import { runWithToast } from '@/lib/notify'

type StaffOption = { id: string; name: string }

export function ProjectTaskComments({
  taskId,
  staff,
  embedded = false,
  concise = false,
  hideEmpty = false,
  onCountChange,
}: {
  taskId: string
  staff: StaffOption[]
  embedded?: boolean
  concise?: boolean
  hideEmpty?: boolean
  onCountChange?: (count: number) => void
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const [comments, setComments] = useState<OpsProjectTaskComment[]>([])
  const [loading, setLoading] = useState(true)
  const [pending, startTransition] = useTransition()
  const [composerKey, setComposerKey] = useState(0)

  const loadComments = useCallback(async () => {
    setLoading(true)
    try {
      const rows = await listTaskComments(taskId)
      setComments(rows)
      onCountChange?.(rows.length)
    } finally {
      setLoading(false)
    }
  }, [taskId, onCountChange])

  useEffect(() => {
    void loadComments()
  }, [loadComments])

  function handleSubmit() {
    const form = formRef.current
    if (!form) return
    const body = (new FormData(form).get('body') as string)?.trim()
    if (!body) return

    startTransition(async () => {
      const ok = await runWithToast(() => addTaskComment(taskId, body), {
        loading: 'Posting note…',
        success: 'Note added',
      })
      if (ok === null) return
      form.reset()
      setComposerKey(key => key + 1)
      await loadComments()
    })
  }

  const threadComments = comments.map(comment => ({
    id: comment.id,
    body: comment.body,
    author_id: comment.authorId,
    authorName: comment.authorName,
    authorRole: comment.authorRole,
    is_internal: true,
    created_at: comment.createdAt,
  }))

  const showThread = !loading && comments.length > 0

  return (
    <section
      className={`ops-task-comments${embedded ? ' ops-task-comments--embedded' : ''}${concise ? ' ops-task-comments--concise' : ''}`}
    >
      <div className="ops-task-comments-head">
        <span className="ops-task-comments-label">Internal notes</span>
      </div>
      {showThread ? (
        <CommentThread
          comments={threadComments}
          showInternal
          staffNames={staff.map(member => member.name)}
        />
      ) : hideEmpty ? null : loading ? null : (
        <CommentThread comments={[]} showInternal staffNames={staff.map(member => member.name)} />
      )}
      <form ref={formRef} className="ops-task-comments-form" onSubmit={e => e.preventDefault()}>
        <MentionTextarea
          resetKey={composerKey}
          staff={staff}
          disabled={pending}
          placeholder="Add a note…"
          rows={concise ? 2 : 4}
        />
        <button
          type="button"
          className="dash-btn-secondary btn-secondary"
          disabled={pending}
          onClick={handleSubmit}
        >
          {pending ? 'Posting…' : 'Add note'}
        </button>
      </form>
    </section>
  )
}
