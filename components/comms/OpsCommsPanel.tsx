'use client'

import '@stream-io/video-react-sdk/dist/css/styles.css'

import { useEffect } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Users, X } from 'lucide-react'
import type { StreamChat as StreamChatClient } from 'stream-chat'
import { StreamVideo, type StreamVideoClient } from '@stream-io/video-react-sdk'
import type { StreamCommsCredentials } from '@/lib/comms/stream-server'
import { OpsCommsChat } from '@/components/comms/OpsCommsChat'
import { Button } from '@/components/ui/button'

type OpsCommsPanelProps = {
  open: boolean
  onClose: () => void
  loading: boolean
  error: string | null
  onRetry: () => void
  chatClient: StreamChatClient | null
  videoClient: StreamVideoClient | null
  credentials: StreamCommsCredentials | null
  activeChannelId: string
  onSelectChannel: (channelId: string) => void
}

export function OpsCommsPanel({
  open,
  onClose,
  loading,
  error,
  onRetry,
  chatClient,
  videoClient,
  credentials,
  activeChannelId,
  onSelectChannel,
}: OpsCommsPanelProps) {
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="ops-comms-panel"
          role="dialog"
          aria-modal="true"
          aria-label="Team comms"
          className="ops-comms-panel"
          initial={reducedMotion ? false : { opacity: 0, y: 16, scale: 0.98 }}
          animate={reducedMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
          exit={reducedMotion ? undefined : { opacity: 0, y: 12, scale: 0.98 }}
          transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
        >
          <div className="ops-comms-panel-accent" aria-hidden />

          <div className="ops-comms-panel-head">
            <div className="ops-comms-panel-brand">
              <span className="ops-comms-panel-brand-icon" aria-hidden>
                <Users />
              </span>
              <div>
                <h3 className="ops-comms-panel-title">COMMS</h3>
                <p className="ops-comms-panel-subtitle">Internal chat and huddles</p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="ops-comms-panel-close"
              onClick={onClose}
              aria-label="Close team comms"
            >
              <X />
            </Button>
          </div>

          <div className="ops-comms-panel-body">
            {loading ? (
              <div className="ops-comms-panel-state">
                <span className="ops-comms-panel-spinner" aria-hidden />
                Connecting team comms…
              </div>
            ) : null}

            {!loading && error ? (
              <div className="ops-comms-panel-state">
                <p>{error}</p>
                <Button type="button" size="sm" variant="outline" onClick={onRetry}>
                  Retry
                </Button>
              </div>
            ) : null}

            {!loading && !error && chatClient?.userID && videoClient && credentials ? (
              <StreamVideo client={videoClient}>
                <div className="ops-comms-panel-content">
                  <OpsCommsChat
                    chatClient={chatClient}
                    videoClient={videoClient}
                    credentials={credentials}
                    active={open}
                    activeChannelId={activeChannelId}
                    onSelectChannel={onSelectChannel}
                  />
                </div>
              </StreamVideo>
            ) : null}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
