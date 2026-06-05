'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

export function MentionTextarea({
  staff,
  disabled,
  placeholder,
  rows = 4,
  resetKey = 0,
}: {
  staff: { id: string; name: string }[]
  disabled?: boolean
  placeholder?: string
  rows?: number
  resetKey?: number
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [value, setValue] = useState('')
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    setValue('')
    setMentionQuery(null)
    setActiveIndex(0)
  }, [resetKey])

  const suggestions = useMemo(() => {
    if (mentionQuery === null) return []
    const q = mentionQuery.toLowerCase()
    return staff.filter(s => s.name.toLowerCase().includes(q)).slice(0, 6)
  }, [mentionQuery, staff])

  function updateMentionState(nextValue: string, cursor: number) {
    const before = nextValue.slice(0, cursor)
    const atMatch = before.match(/@([^\n@]*)$/)
    if (atMatch) {
      setMentionQuery(atMatch[1])
      setActiveIndex(0)
    } else {
      setMentionQuery(null)
    }
  }

  function insertMention(name: string) {
    const el = textareaRef.current
    if (!el) return

    const cursor = el.selectionStart
    const before = value.slice(0, cursor)
    const after = value.slice(cursor)
    const atIndex = before.lastIndexOf('@')
    if (atIndex < 0) return

    const next = `${value.slice(0, atIndex)}@${name} ${after}`
    setValue(next)
    setMentionQuery(null)

    requestAnimationFrame(() => {
      const pos = atIndex + name.length + 2
      el.focus()
      el.setSelectionRange(pos, pos)
    })
  }

  return (
    <div className="mention-textarea-wrap">
      <textarea
        ref={textareaRef}
        name="body"
        required
        rows={rows}
        value={value}
        placeholder={placeholder}
        className="btf-input w-full resize-y mention-textarea"
        disabled={disabled}
        onChange={e => {
          setValue(e.target.value)
          updateMentionState(e.target.value, e.target.selectionStart)
        }}
        onClick={e => updateMentionState(value, e.currentTarget.selectionStart)}
        onKeyUp={e => updateMentionState(value, e.currentTarget.selectionStart)}
        onKeyDown={e => {
          if (mentionQuery === null || suggestions.length === 0) return
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setActiveIndex(i => (i + 1) % suggestions.length)
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActiveIndex(i => (i - 1 + suggestions.length) % suggestions.length)
          } else if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault()
            insertMention(suggestions[activeIndex].name)
          } else if (e.key === 'Escape') {
            setMentionQuery(null)
          }
        }}
      />
      {staff.length > 0 ? (
        <p className="mention-textarea-hint dash-meta">
          Type <span className="mention-textarea-hint-kw">@name</span> in internal notes to tag
          admins and members.
        </p>
      ) : null}
      {mentionQuery !== null && suggestions.length > 0 ? (
        <ul className="mention-suggestions" role="listbox">
          {suggestions.map((s, index) => (
            <li key={s.id} role="option" aria-selected={index === activeIndex}>
              <button
                type="button"
                className={`mention-suggestion ${index === activeIndex ? 'is-active' : ''}`}
                onMouseDown={e => {
                  e.preventDefault()
                  insertMention(s.name)
                }}
              >
                @{s.name}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
