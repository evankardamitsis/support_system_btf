import { authorInitials, authorRoleLabel } from '@/lib/comments/authors'
import { splitCommentBody } from '@/lib/comments/mentions'

export type AttachmentItem = {
  id: string
  fileName: string
  mimeType: string | null
}

export type CommentItem = {
  id: string
  body: string
  author_id: string
  authorName: string
  authorRole: string | null
  is_internal: boolean
  created_at: string
  attachments?: AttachmentItem[]
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function CommentBody({
  body,
  staffNames,
}: {
  body: string
  staffNames: string[]
}) {
  const parts = splitCommentBody(body, staffNames)

  return (
    <p className="ticket-detail-comment-text">
      {parts.map((part, index) =>
        part.type === 'mention' ? (
          <span key={index} className="ticket-detail-comment-mention">
            {part.value}
          </span>
        ) : (
          <span key={index}>{part.value}</span>
        )
      )}
    </p>
  )
}

function CommentImages({ attachments }: { attachments: AttachmentItem[] }) {
  const images = attachments.filter(a => a.mimeType?.startsWith('image/'))
  if (images.length === 0) return null
  return (
    <div className="ticket-comment-images">
      {images.map(a => (
        <a
          key={a.id}
          href={`/api/tickets/attachments/${a.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="ticket-comment-image-link"
          title={a.fileName}
        >
          <img
            src={`/api/tickets/attachments/${a.id}`}
            alt={a.fileName}
            className="ticket-comment-image"
            loading="lazy"
          />
        </a>
      ))}
    </div>
  )
}

interface CommentThreadProps {
  comments: CommentItem[]
  showInternal?: boolean
  staffNames?: string[]
}

export function CommentThread({
  comments,
  showInternal = false,
  staffNames = [],
}: CommentThreadProps) {
  const visible = showInternal ? comments : comments.filter(c => !c.is_internal)

  if (visible.length === 0) {
    return (
      <div className="ticket-detail-thread-empty">
        <p className="dash-meta">No messages yet — start the conversation below.</p>
      </div>
    )
  }

  return (
    <div className="ticket-detail-thread">
      {visible.map(c => {
        const roleLabel = authorRoleLabel(c.authorRole)

        return (
          <article
            key={c.id}
            className={`ticket-detail-comment ${c.is_internal ? 'ticket-detail-comment--internal' : ''}`}
          >
            <div className="ticket-detail-comment-avatar" aria-hidden>
              {authorInitials(c.authorName)}
            </div>
            <div className="ticket-detail-comment-body">
              <div className="ticket-detail-comment-meta">
                <span className="ticket-detail-comment-author">{c.authorName}</span>
                {roleLabel ? (
                  <span className="ticket-detail-comment-role">{roleLabel}</span>
                ) : null}
                {c.is_internal ? (
                  <span className="ticket-detail-comment-badge">Internal</span>
                ) : null}
                <time className="dash-meta">{relativeTime(c.created_at)}</time>
              </div>
              <CommentBody body={c.body} staffNames={staffNames} />
              {c.attachments && c.attachments.length > 0 ? (
                <CommentImages attachments={c.attachments} />
              ) : null}
            </div>
          </article>
        )
      })}
    </div>
  )
}
