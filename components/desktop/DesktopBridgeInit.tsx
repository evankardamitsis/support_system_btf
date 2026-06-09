'use client'

import { useEffect } from 'react'
import { initDesktopFocus } from '@/lib/desktop/focus'

/** Wires Electron focus tracking for desktop notification gating. */
export function DesktopBridgeInit() {
  useEffect(() => {
    initDesktopFocus()
  }, [])

  return null
}
