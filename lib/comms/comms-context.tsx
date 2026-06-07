'use client'

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react'
import { STREAM_TEAM_CHANNEL_ID } from '@/lib/comms/stream-config'

type CommsContextValue = {
  panelOpen: boolean
  setPanelOpen: (open: boolean) => void
  activeChannelId: string
  setActiveChannelId: (channelId: string) => void
  openComms: (channelId?: string) => void
  huddleAutoOpen: boolean
  setHuddleAutoOpen: (open: boolean) => void
}

const CommsContext = createContext<CommsContextValue | null>(null)

export function CommsProvider({ children }: { children: ReactNode }) {
  const [panelOpen, setPanelOpen] = useState(false)
  const [activeChannelId, setActiveChannelId] = useState(STREAM_TEAM_CHANNEL_ID)
  const [huddleAutoOpen, setHuddleAutoOpen] = useState(false)

  const openComms = useCallback((channelId?: string) => {
    if (channelId) setActiveChannelId(channelId)
    setPanelOpen(true)
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
