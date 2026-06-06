'use client'

import { useCallback, useEffect, useState } from 'react'

const DESKTOP_MQ = '(min-width: 1024px)'

function getInitialSidebarOpen() {
  if (typeof window === 'undefined') return false
  return window.matchMedia(DESKTOP_MQ).matches
}

export function useSidebarOpen() {
  const [sidebarOpen, setSidebarOpen] = useState(getInitialSidebarOpen)

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_MQ)

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
