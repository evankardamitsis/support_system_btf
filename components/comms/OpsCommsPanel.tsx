'use client'

import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Headphones, MessageSquare, Users, X } from 'lucide-react'
import type { StreamChat as StreamChatClient } from 'stream-chat'
import type { StreamVideoClient } from '@stream-io/video-react-sdk'
import type { StreamCommsCredentials } from '@/lib/comms/stream-server'
import { OpsCommsChat } from '@/components/comms/OpsCommsChat'
import { OpsCommsHuddle } from '@/components/comms/OpsCommsHuddle'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type OpsCommsTab = 'chat' | 'huddle'

type OpsCommsPanelProps = {
  open: boolean
  onClose: () => void
  loading: boolean
  error: string | null
  onRetry: () => void
  chatClient: StreamChatClient | null
  videoClient: StreamVideoClient | null
  credentials: StreamCommsCredentials | null
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
}: OpsCommsPanelProps) {
  const [tab, setTab] = useState<OpsCommsTab>('chat')
  const reducedMotion = useReducedMotion()

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="ops-comms-panel"
          role="dialog"
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

          <div className="ops-comms-panel-tabs" role="tablist" aria-label="Comms sections">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'chat'}
              className={cn('ops-comms-panel-tab', tab === 'chat' && 'is-active')}
              onClick={() => setTab('chat')}
            >
              <MessageSquare className="ops-comms-panel-tab-icon" aria-hidden />
              Chat
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'huddle'}
              className={cn('ops-comms-panel-tab', tab === 'huddle' && 'is-active')}
              onClick={() => setTab('huddle')}
            >
              <Headphones className="ops-comms-panel-tab-icon" aria-hidden />
              Huddle
            </button>
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

            {!loading && !error && chatClient && videoClient && credentials ? (
              <div className="ops-comms-panel-content">
                {tab === 'chat' ? (
                  <OpsCommsChat chatClient={chatClient} credentials={credentials} />
                ) : (
                  <OpsCommsHuddle videoClient={videoClient} credentials={credentials} />
                )}
              </div>
            ) : null}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
