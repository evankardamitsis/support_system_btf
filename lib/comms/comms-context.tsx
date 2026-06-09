'use client'

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react'
import { STREAM_TEAM_CHANNEL_ID } from '@/lib/comms/stream-config'

export type CommsHuddleSession = {
  channelId: string
  channelLabel: string
  ticketId?: string | null
  /** After joining, collapse to the mini player so chat stays usable. */
  autoMinimizeOnJoin?: boolean
}

type CommsContextValue = {
  panelOpen: boolean
  setPanelOpen: (open: boolean) => void
  activeChannelId: string
  setActiveChannelId: (channelId: string) => void
  openComms: (channelId?: string) => void
  huddleAutoOpen: boolean
  setHuddleAutoOpen: (open: boolean) => void
  huddleSession: CommsHuddleSession | null
  huddleLive: boolean
  setHuddleLive: (live: boolean) => void
  huddleMinimized: boolean
  setHuddleMinimized: (minimized: boolean) => void
  openHuddle: (session: CommsHuddleSession) => void
  closeHuddle: () => void
}

const CommsContext = createContext<CommsContextValue | null>(null)

export function CommsProvider({ children }: { children: ReactNode }) {
  const [panelOpen, setPanelOpen] = useState(false)
  const [activeChannelId, setActiveChannelId] = useState(STREAM_TEAM_CHANNEL_ID)
  const [huddleAutoOpen, setHuddleAutoOpen] = useState(false)
  const [huddleSession, setHuddleSession] = useState<CommsHuddleSession | null>(null)
  const [huddleLive, setHuddleLive] = useState(false)
  const [huddleMinimized, setHuddleMinimized] = useState(false)

  const openComms = useCallback((channelId?: string) => {
    if (channelId) setActiveChannelId(channelId)
    setPanelOpen(true)
  }, [])

  const openHuddle = useCallback((session: CommsHuddleSession) => {
    setHuddleSession(prev => {
      if (prev?.channelId === session.channelId) {
        return { ...prev, ...session }
      }
      return session
    })
    setHuddleMinimized(false)
  }, [])

  const closeHuddle = useCallback(() => {
    setHuddleSession(null)
    setHuddleLive(false)
    setHuddleMinimized(false)
  }, [])

  return (
    <CommsContext.Provider
      value={{
        panelOpen,
        setPanelOpen,
        activeChannelId,
        setActiveChannelId,
        openComms,
        huddleAutoOpen,
        setHuddleAutoOpen,
        huddleSession,
        huddleLive,
        setHuddleLive,
        huddleMinimized,
        setHuddleMinimized,
        openHuddle,
        closeHuddle,
      }}
    >
      {children}
    </CommsContext.Provider>
  )
}

export function useComms() {
  const context = useContext(CommsContext)
  if (!context) {
    throw new Error('useComms must be used within CommsProvider')
  }
  return context
}

export function useCommsOptional() {
  return useContext(CommsContext)
}
