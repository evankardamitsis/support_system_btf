'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  searchClients,
  searchFinancialOffers,
  searchHostingContracts,
  searchOpsProjects,
  searchOpsTasks,
} from '@/lib/search/ops'

export function OpsDashboardSearch({
  isAdmin = false,
  placeholder = 'Search projects, offers, hosting…',
}: {
  isAdmin?: boolean
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
  const [projects, setProjects] = useState<Awaited<ReturnType<typeof searchOpsProjects>>>([])
  const [tasks, setTasks] = useState<Awaited<ReturnType<typeof searchOpsTasks>>>([])
  const [offers, setOffers] = useState<Awaited<ReturnType<typeof searchFinancialOffers>>>([])
  const [hosting, setHosting] = useState<Awaited<ReturnType<typeof searchHostingContracts>>>([])
  const [clients, setClients] = useState<Awaited<ReturnType<typeof searchClients>>>([])

  const runSearch = useCallback(
    async (q: string) => {
      const trimmed = q.trim()
      if (trimmed.length < 2) {
        setProjects([])
        setTasks([])
        setOffers([])
        setHosting([])
        setClients([])
        setError(null)
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)
      const supabase = createClient()

      try {
        const [projectHits, taskHits, offerHits, hostingHits, clientHits] = await Promise.all([
          isAdmin ? searchOpsProjects(supabase, trimmed) : Promise.resolve([]),
          isAdmin ? searchOpsTasks(supabase, trimmed) : Promise.resolve([]),
          searchFinancialOffers(supabase, trimmed),
          searchHostingContracts(supabase, trimmed),
          searchClients(supabase, trimmed, 5),
        ])
        setProjects(projectHits)
        setTasks(taskHits)
        setOffers(offerHits)
        setHosting(hostingHits)
        setClients(clientHits)
      } catch (err) {
        setProjects([])
        setTasks([])
        setOffers([])
        setHosting([])
        setClients([])
        setError(err instanceof Error ? err.message : 'Search failed')
      } finally {
        setLoading(false)
      }
    },
    [isAdmin]
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

  function go(href: string) {
    setOpen(false)
    setQuery('')
    router.push(href)
  }

  function goFirstResult() {
    const q = query.trim()
    if (q.length < 2) return
    if (projects[0]) {
      go(`/admin/ops/projects/${projects[0].id}`)
      return
    }
    if (offers[0]) {
      go(`/admin/ops/financial-offers/${offers[0].id}`)
      return
    }
    if (hosting[0]) {
      go(`/admin/ops/hosting-maintenance/${hosting[0].id}`)
      return
    }
    if (tasks[0]) {
      go(`/admin/ops/projects/${tasks[0].projectId}?task=${tasks[0].id}`)
      return
    }
    if (clients[0]) {
      go(`/admin/clients/${clients[0].id}`)
    }
  }

  const hasQuery = query.trim().length >= 2
  const hasResults =
    projects.length > 0 ||
    tasks.length > 0 ||
    offers.length > 0 ||
    hosting.length > 0 ||
    clients.length > 0
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
        Search operations
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
          placeholder={placeholder}
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
              {projects.length > 0 ? (
                <div className="dash-search-group">
                  <p className="dash-search-group-label">Projects</p>
                  {projects.map(project => (
                    <button
                      key={project.id}
                      type="button"
                      role="option"
                      className="dash-search-hit"
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => go(`/admin/ops/projects/${project.id}`)}
                    >
                      <span className="dash-search-hit-title">{project.name}</span>
                      <span className="dash-search-hit-meta">
                        {project.clientName ?? 'Internal'}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
              {tasks.length > 0 ? (
                <div className="dash-search-group">
                  <p className="dash-search-group-label">Tasks</p>
                  {tasks.map(task => (
                    <button
                      key={task.id}
                      type="button"
                      role="option"
                      className="dash-search-hit"
                      onMouseDown={e => e.preventDefault()}
                      onClick={() =>
                        go(`/admin/ops/projects/${task.projectId}?task=${task.id}`)
                      }
                    >
                      <span className="dash-search-hit-title">{task.title}</span>
                      <span className="dash-search-hit-meta">{task.projectName}</span>
                    </button>
                  ))}
                </div>
              ) : null}
              {offers.length > 0 ? (
                <div className="dash-search-group">
                  <p className="dash-search-group-label">Offers</p>
                  {offers.map(offer => (
                    <button
                      key={offer.id}
                      type="button"
                      role="option"
                      className="dash-search-hit"
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => go(`/admin/ops/financial-offers/${offer.id}`)}
                    >
                      <span className="dash-search-hit-title">{offer.clientName}</span>
                      <span className="dash-search-hit-meta">{offer.status}</span>
                    </button>
                  ))}
                </div>
              ) : null}
              {hosting.length > 0 ? (
                <div className="dash-search-group">
                  <p className="dash-search-group-label">Hosting</p>
                  {hosting.map(contract => (
                    <button
                      key={contract.id}
                      type="button"
                      role="option"
                      className="dash-search-hit"
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => go(`/admin/ops/hosting-maintenance/${contract.id}`)}
                    >
                      <span className="dash-search-hit-title">{contract.name}</span>
                      <span className="dash-search-hit-meta">{contract.clientName}</span>
                    </button>
                  ))}
                </div>
              ) : null}
              {clients.length > 0 ? (
                <div className="dash-search-group">
                  <p className="dash-search-group-label">Clients</p>
                  {clients.map(client => (
                    <button
                      key={client.id}
                      type="button"
                      role="option"
                      className="dash-search-hit"
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => go(`/admin/clients/${client.id}`)}
                    >
                      <span className="dash-search-hit-title">{client.name}</span>
                      <span className="dash-search-hit-meta">{client.email}</span>
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
