interface Comment {
  id: string
  body: string
  author_id: string
  is_internal: boolean
  created_at: string
}

function initials(id: string): string {
  return id.substring(0, 2).toUpperCase()
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

interface CommentThreadProps {
  comments: Comment[]
  showInternal?: boolean
}

export function CommentThread({ comments, showInternal = false }: CommentThreadProps) {
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
      {visible.map(c => (
        <article
          key={c.id}
          className={`ticket-detail-comment ${c.is_internal ? 'ticket-detail-comment--internal' : ''}`}
        >
          <div className="ticket-detail-comment-avatar" aria-hidden>
            {initials(c.author_id)}
          </div>
          <div className="ticket-detail-comment-body">
            <div className="ticket-detail-comment-meta">
              {c.is_internal ? <span className="ticket-detail-comment-badge">Internal</span> : null}
              <time className="dash-meta">{relativeTime(c.created_at)}</time>
            </div>
            <p className="ticket-detail-comment-text">{c.body}</p>
          </div>
        </article>
      ))}
    </div>
  )
}
