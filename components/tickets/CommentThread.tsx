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
      <div className="py-8 text-center">
        <p className="text-sm dash-meta">No activity yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {visible.map(c => (
        <div key={c.id} className="flex gap-3">
          <div
            className="w-8 h-8 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 font-mono"
            style={{ background: 'var(--accent)', color: 'var(--bg)' }}
          >
            {initials(c.author_id)}
          </div>

          <div
            className="flex-1 px-4 py-3"
            style={{
              background: c.is_internal ? 'rgba(255, 170, 0, 0.06)' : 'var(--bg)',
              border: `1px solid ${c.is_internal ? 'rgba(255, 170, 0, 0.2)' : 'var(--border)'}`,
            }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              {c.is_internal && (
                <span
                  className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium font-mono uppercase tracking-wide"
                  style={{
                    background: 'rgba(255, 170, 0, 0.12)',
                    color: 'var(--warning)',
                  }}
                >
                  Internal
                </span>
              )}
              <span className="dash-meta">{relativeTime(c.created_at)}</span>
            </div>
            <p
              className="text-sm leading-relaxed whitespace-pre-wrap"
              style={{ color: 'var(--text-1)', fontFamily: 'var(--font-geist)' }}
            >
              {c.body}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
