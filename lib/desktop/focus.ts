import { isDesktopApp } from '@/lib/desktop/bridge'

let windowFocused = true
let initialized = false
const listeners = new Set<(focused: boolean) => void>()

export function initDesktopFocus() {
  if (typeof window === 'undefined' || initialized || !isDesktopApp()) return
  initialized = true

  const bridge = window.btfDesktop
  if (!bridge?.onFocusChange) return

  bridge.onFocusChange(focused => {
    windowFocused = focused
    for (const listener of listeners) {
      listener(focused)
    }
  })
}

export function subscribeDesktopFocus(listener: (focused: boolean) => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** True when the user is actively viewing the app (focused window / visible tab). */
export function isAppFocused() {
  if (typeof document === 'undefined') return true
  if (isDesktopApp()) {
    return windowFocused && document.visibilityState === 'visible'
  }
  return document.visibilityState === 'visible'
}

/** True when we should use native desktop alerts (unfocused / background). */
export function shouldUseDesktopAlerts() {
  if (typeof document === 'undefined') return false
  if (!isDesktopApp()) {
    return document.visibilityState === 'hidden'
  }
  return !windowFocused || document.visibilityState === 'hidden'
}
