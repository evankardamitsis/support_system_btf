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
        <p className="text-sm text-gray-400">No activity yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {visible.map((c) => (
        <div key={c.id} className="flex gap-3">
          {/* Avatar */}
          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-[11px] font-medium text-gray-600 shrink-0 mt-0.5">
            {initials(c.author_id)}
          </div>

          {/* Bubble */}
          <div className={`flex-1 rounded-lg px-4 py-3 ${
            c.is_internal
              ? 'bg-amber-50 border border-amber-200'
              : 'bg-gray-50 border border-gray-100'
          }`}>
            <div className="flex items-center gap-2 mb-1.5">
              {c.is_internal && (
                <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">
                  Internal
                </span>
              )}
              <span className="text-xs text-gray-400">{relativeTime(c.created_at)}</span>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{c.body}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
