'use client'

import { useCallback, useEffect, useState } from 'react'
import { Search, X } from 'lucide-react'
import type { StreamChat as StreamChatClient } from 'stream-chat'
import type { StreamCommsCredentials } from '@/lib/comms/stream-server'
import { notifyError } from '@/lib/notify'

type SearchHit = {
  channelId: string
  channelName: string
  messageId: string
  text: string
  createdAt: string
  userName: string
}

type OpsCommsSearchProps = {
  chatClient: StreamChatClient
  credentials: StreamCommsCredentials
  open: boolean
  onClose: () => void
  onSelectChannel: (channelId: string) => void
}

export function OpsCommsSearch({
  chatClient,
  credentials,
  open,
  onClose,
  onSelectChannel,
}: OpsCommsSearchProps) {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<SearchHit[]>([])

  const runSearch = useCallback(
    async (value: string) => {
      const trimmed = value.trim()
      if (!trimmed || !chatClient.userID) {
        setResults([])
        return
      }

      setLoading(true)
      try {
        const response = await chatClient.search(
          { members: { $in: [credentials.userId] } },
          trimmed,
          { limit: 20 }
        )

        const hits: SearchHit[] = []
        for (const item of response.results ?? []) {
          const message = item.message
          const cid = message?.cid ?? ''
          const channelId = cid.includes(':') ? cid.split(':')[1] : ''
          if (!message?.id || !channelId) continue
          hits.push({
            channelId,
            channelName: channelId,
            messageId: message.id,
            text: message.text ?? '',
            createdAt: message.created_at ?? '',
            userName: message.user?.name ?? 'Team member',
          })
        }
        setResults(hits)
      } catch {
        notifyError('Search failed')
        setResults([])
      } finally {
        setLoading(false)
      }
    },
    [chatClient, credentials.userId]
  )

  useEffect(() => {
    if (!open) {
      setQuery('')
      setResults([])
      return
    }

    const timer = window.setTimeout(() => {
      void runSearch(query)
    }, 220)

    return () => window.clearTimeout(timer)
  }, [open, query, runSearch])

  useEffect(() => {
    if (!open) return

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="ops-comms-search-overlay" role="presentation" onClick={onClose}>
      <div
        className="ops-comms-search-panel"
        role="dialog"
        aria-label="Search COMMS"
        onClick={event => event.stopPropagation()}
      >
        <div className="ops-comms-search-head">
          <Search className="ops-comms-search-icon" aria-hidden />
          <input
            className="ops-comms-search-input"
            value={query}
            placeholder="Search messages across channels…"
            autoFocus
            onChange={event => setQuery(event.target.value)}
          />
          <button
            type="button"
            className="ops-comms-search-close"
            aria-label="Close search"
            onClick={onClose}
          >
            <X aria-hidden />
          </button>
        </div>
        <div className="ops-comms-search-results">
          {loading ? <p className="ops-comms-search-empty">Searching…</p> : null}
          {!loading && query.trim() && results.length === 0 ? (
            <p className="ops-comms-search-empty">No messages found.</p>
          ) : null}
          {!loading
            ? results.map(hit => (
                <button
                  key={`${hit.channelId}-${hit.messageId}`}
                  type="button"
                  className="ops-comms-search-hit"
                  onClick={() => {
                    onSelectChannel(hit.channelId)
                    onClose()
                  }}
                >
                  <span className="ops-comms-search-hit-channel">{hit.channelName}</span>
                  <span className="ops-comms-search-hit-text">
                    <strong>{hit.userName}:</strong> {hit.text}
                  </span>
                </button>
              ))
            : null}
        </div>
      </div>
    </div>
  )
}
