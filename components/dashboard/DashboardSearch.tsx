'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatTicketId } from '@/lib/tickets/display'
import { searchClients, searchTickets } from '@/lib/search/dashboard'

export function DashboardSearch({
  variant,
  placeholder,
}: {
  variant: 'admin' | 'portal'
  placeholder?: string
}) {
  const router = useRouter()
  const listId = useId()
  const wrapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tickets, setTickets] = useState<Awaited<ReturnType<typeof searchTickets>>>([])
  const [clients, setClients] = useState<Awaited<ReturnType<typeof searchClients>>>([])

  const runSearch = useCallback(
    async (q: string) => {
      const trimmed = q.trim()
      if (trimmed.length < 2) {
        setTickets([])
        setClients([])
        setError(null)
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)
      const supabase = createClient()

      try {
        if (variant === 'admin') {
          const [ticketHits, clientHits] = await Promise.all([
            searchTickets(supabase, trimmed),
            searchClients(supabase, trimmed),
          ])
          setTickets(ticketHits)
          setClients(clientHits)
        } else {
          setTickets(await searchTickets(supabase, trimmed))
          setClients([])
        }
      } catch (err) {
        setTickets([])
        setClients([])
        setError(err instanceof Error ? err.message : 'Search failed')
      } finally {
        setLoading(false)
      }
    },
    [variant]
  )

  useEffect(() => {
    if (!open) return
    const t = window.setTimeout(() => runSearch(query), 200)
    return () => window.clearTimeout(t)
  }, [query, open, runSearch])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        setOpen(true)
      }
      if (e.key === 'Escape') {
        setOpen(false)
        inputRef.current?.blur()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    const onPointer = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointer)
    return () => document.removeEventListener('mousedown', onPointer)
  }, [])

  const ticketPrefix = variant === 'admin' ? '/admin/tickets' : '/portal/tickets'

  function go(href: string) {
    setOpen(false)
    setQuery('')
    router.push(href)
  }

  function goFirstResult() {
    const q = query.trim()
    if (q.length < 2) return
    if (tickets[0]) {
      go(`${ticketPrefix}/${tickets[0].id}`)
      return
    }
    if (variant === 'admin' && clients[0]) {
      go(`/admin/clients/${clients[0].id}`)
    }
  }

  const hasQuery = query.trim().length >= 2
  const hasResults = tickets.length > 0 || clients.length > 0
  const showPanel = open && hasQuery

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      goFirstResult()
    }
  }

  return (
    <div className="dash-search-wrap" ref={wrapRef}>
      <label htmlFor={listId} className="sr-only">
        Search
      </label>
      <div className={`dash-search ${open ? 'dash-search--focused' : ''}`}>
        <Search size={14} className="dash-search-icon" aria-hidden />
        <input
          ref={inputRef}
          id={listId}
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder ?? (variant === 'admin' ? 'Search tickets, clients…' : 'Search tickets…')}
          className="dash-search-input"
          autoComplete="off"
          spellCheck={false}
        />
        <kbd className="dash-search-kbd hidden sm:inline">⌘K</kbd>
      </div>

      {showPanel ? (
        <div className="dash-search-results anim-fade" role="listbox">
          {loading ? (
            <p className="dash-search-status">Searching…</p>
          ) : error ? (
            <p className="dash-search-status">{error}</p>
          ) : hasResults ? (
            <>
              {tickets.length > 0 ? (
                <div className="dash-search-group">
                  <p className="dash-search-group-label">Tickets</p>
                  {tickets.map(t => (
                    <button
                      key={t.id}
                      type="button"
                      role="option"
                      className="dash-search-hit"
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => go(`${ticketPrefix}/${t.id}`)}
                    >
                      <span className="dash-search-hit-id">{formatTicketId(t.id)}</span>
                      <span className="dash-search-hit-title">{t.title}</span>
                    </button>
                  ))}
                </div>
              ) : null}
              {variant === 'admin' && clients.length > 0 ? (
                <div className="dash-search-group">
                  <p className="dash-search-group-label">Clients</p>
                  {clients.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      role="option"
                      className="dash-search-hit"
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => go(`/admin/clients/${c.id}`)}
                    >
                      <span className="dash-search-hit-title">{c.name}</span>
                      <span className="dash-search-hit-meta">{c.email}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <p className="dash-search-status">No results for &ldquo;{query.trim()}&rdquo;</p>
          )}
        </div>
      ) : null}
    </div>
  )
}
