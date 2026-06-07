'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useMessageComposerController } from 'stream-chat-react'
import { cn } from '@/lib/utils'
import { giphyResultToStreamAttachment, type GiphyResult } from '@/lib/comms/giphy'
import { notifyError } from '@/lib/notify'

type PanelPosition = {
  left: number
  bottom: number
  width: number
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export function OpsCommsGiphyPicker() {
  const messageComposer = useMessageComposerController()
  const { channel } = messageComposer
  const [open, setOpen] = useState(false)
  const [portalReady, setPortalReady] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GiphyResult[]>([])
  const [loading, setLoading] = useState(false)
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [panelPosition, setPanelPosition] = useState<PanelPosition | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setPortalReady(true)
  }, [])

  const measurePanelPosition = useCallback((): PanelPosition | null => {
    const trigger = triggerRef.current
    if (!trigger) return null

    const rect = trigger.getBoundingClientRect()
    const width = Math.min(352, window.innerWidth - 16)
    const left = clamp(rect.right - width, 8, window.innerWidth - width - 8)
    const bottom = window.innerHeight - rect.top + 10

    return { left, bottom, width }
  }, [])

  const syncPanelPosition = useCallback(() => {
    const next = measurePanelPosition()
    if (next) setPanelPosition(next)
  }, [measurePanelPosition])

  useEffect(() => {
    if (!open) return
    syncPanelPosition()

    function handleLayout() {
      syncPanelPosition()
    }

    window.addEventListener('resize', handleLayout)
    window.addEventListener('scroll', handleLayout, true)
    return () => {
      window.removeEventListener('resize', handleLayout)
      window.removeEventListener('scroll', handleLayout, true)
    }
  }, [open, syncPanelPosition])

  useEffect(() => {
    if (!open) return

    function handlePointer(event: MouseEvent) {
      const target = event.target as Node
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return
      setOpen(false)
    }

    const timeout = window.setTimeout(() => {
      document.addEventListener('mousedown', handlePointer)
    }, 0)

    return () => {
      window.clearTimeout(timeout)
      document.removeEventListener('mousedown', handlePointer)
    }
  }, [open])

  useEffect(() => {
    if (!open) return

    const controller = new AbortController()
    const trimmed = query.trim()
    const timeout = window.setTimeout(() => {
      setLoading(true)
      const params = new URLSearchParams()
      if (trimmed) params.set('q', trimmed)
      else params.set('trending', '1')

      void fetch(`/api/comms/giphy/search?${params}`, { signal: controller.signal })
        .then(async response => {
          const body = (await response.json().catch(() => null)) as
            | { results?: GiphyResult[]; error?: string }
            | null
          if (!response.ok) {
            throw new Error(body?.error ?? 'GIF search failed')
          }
          setResults(body?.results ?? [])
        })
        .catch(error => {
          if (controller.signal.aborted) return
          notifyError(error instanceof Error ? error.message : 'GIF search failed')
          setResults([])
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false)
        })
    }, trimmed ? 280 : 0)

    return () => {
      controller.abort()
      window.clearTimeout(timeout)
    }
  }, [open, query])

  function closePicker() {
    setOpen(false)
    setPanelPosition(null)
    setQuery('')
    setResults([])
  }

  async function sendGif(gif: GiphyResult) {
    setSendingId(gif.id)
    try {
      await channel.sendMessage({
        attachments: [giphyResultToStreamAttachment(gif)],
      })
      closePicker()
    } catch (error) {
      notifyError(error instanceof Error ? error.message : 'Could not send GIF')
    } finally {
      setSendingId(null)
    }
  }

  function openPicker() {
    const next = measurePanelPosition()
    if (!next) return
    setPanelPosition(next)
    setOpen(true)
  }

  const panel =
    open && panelPosition && portalReady ? (
      <div
        ref={panelRef}
        className="ops-comms-giphy-picker"
        role="dialog"
        aria-label="GIF search"
        style={{
          position: 'fixed',
          left: panelPosition.left,
          bottom: panelPosition.bottom,
          width: panelPosition.width,
        }}
      >
        <div className="ops-comms-giphy-picker-head">
          <span className="ops-comms-giphy-picker-title">Search GIFs</span>
          <button
            type="button"
            className="ops-comms-giphy-picker-close"
            aria-label="Close GIF search"
            onClick={closePicker}
          >
            <X aria-hidden />
          </button>
        </div>

        <input
          type="search"
          className="ops-comms-giphy-picker-input"
          placeholder="Search Giphy…"
          value={query}
          onChange={event => setQuery(event.target.value)}
          autoFocus
        />

        {loading ? (
          <p className="ops-comms-giphy-picker-status">Searching…</p>
        ) : !query.trim() ? (
          <p className="ops-comms-giphy-picker-status">Trending GIFs</p>
        ) : results.length === 0 ? (
          <p className="ops-comms-giphy-picker-status">No GIFs found.</p>
        ) : null}

        <div className="ops-comms-giphy-picker-grid">
          {results.map(gif => {
            const preview =
              gif.images.fixed_height_downsampled?.url ||
              gif.images.fixed_height?.url ||
              gif.images.preview_gif?.url ||
              gif.images.original?.url ||
              ''

            if (!preview) return null

            return (
              <button
                key={gif.id}
                type="button"
                className="ops-comms-giphy-picker-item"
                disabled={sendingId === gif.id}
                title={gif.title || 'GIF'}
                onClick={() => void sendGif(gif)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt={gif.title || 'GIF'} loading="lazy" />
              </button>
            )
          })}
        </div>
      </div>
    ) : null

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={cn('ops-comms-composer-action ops-comms-composer-action--gif', open && 'is-active')}
        aria-label="Search GIFs"
        aria-expanded={open}
        onClick={() => (open ? closePicker() : openPicker())}
      >
        <span className="ops-comms-composer-action-gif-label">GIF</span>
      </button>
      {portalReady && panel
        ? createPortal(
            <div data-theme="dashboard">
              <div className="ops-comms-picker-portal">{panel}</div>
            </div>,
            document.body
          )
        : null}
    </>
  )
}
