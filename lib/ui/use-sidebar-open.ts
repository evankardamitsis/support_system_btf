'use client'

import { useCallback, useEffect, useState } from 'react'

const DESKTOP_MQ = '(min-width: 1024px)'

export function useSidebarOpen() {
  // Always false on server + first client paint so markup matches during hydration.
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_MQ)

    function syncFromViewport() {
      setSidebarOpen(mq.matches)
    }

    syncFromViewport()

    function onChange(e: MediaQueryListEvent) {
      setSidebarOpen(e.matches)
    }

    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const toggleSidebar = useCallback(() => {
    setSidebarOpen(open => !open)
  }, [])

  const closeSidebar = useCallback(() => {
    if (window.matchMedia(DESKTOP_MQ).matches) return
    setSidebarOpen(false)
  }, [])

  return { sidebarOpen, toggleSidebar, closeSidebar, setSidebarOpen }
}
