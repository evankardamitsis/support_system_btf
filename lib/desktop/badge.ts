import {
  bounceDock,
  cancelDockBounce,
  isDesktopApp,
  setDockBadge,
  type DesktopNotifyInput,
} from '@/lib/desktop/bridge'
import { isAppFocused, subscribeDesktopFocus } from '@/lib/desktop/focus'

export type { DesktopNotifyInput }

let commsUnread = 0
let opsUnread = 0
let criticalBounceActive = false
let focusUnsub: (() => void) | null = null

function totalUnread() {
  return commsUnread + opsUnread
}

function startCriticalBounce() {
  if (criticalBounceActive) return
  criticalBounceActive = true
  bounceDock('critical')

  // Subscribe once to cancel the bounce the moment the user focuses the app
  if (!focusUnsub) {
    focusUnsub = subscribeDesktopFocus(focused => {
      if (focused && criticalBounceActive) {
        cancelDockBounce()
        criticalBounceActive = false
      }
    })
  }
}

function stopCriticalBounce() {
  if (!criticalBounceActive) return
  cancelDockBounce()
  criticalBounceActive = false
}

function syncDockBadge() {
  if (!isDesktopApp()) return
  const count = totalUnread()
  setDockBadge(count)

  if (count > 0 && !isAppFocused()) {
    startCriticalBounce()
  } else if (count === 0) {
    stopCriticalBounce()
  }
}

export function setDesktopCommsUnread(count: number) {
  commsUnread = Math.max(0, count)
  syncDockBadge()
}

export function setDesktopOpsUnread(count: number) {
  opsUnread = Math.max(0, count)
  syncDockBadge()
}

/** Fire a single informational bounce + native notification. */
export function alertDesktopUser() {
  if (!isDesktopApp()) return
  bounceDock('informational')
}
