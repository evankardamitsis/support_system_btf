export type DesktopNotifyInput = {
  title: string
  body?: string | null
  href?: string
}

type BtfDesktopBridge = {
  platform: string
  isDesktop: boolean
  notify: (input: DesktopNotifyInput) => void
  setBadge: (count: number) => void
  bounce: (mode?: 'informational' | 'critical') => void
  cancelBounce: () => void
  onFocusChange: (callback: (focused: boolean) => void) => () => void
}

declare global {
  interface Window {
    btfDesktop?: BtfDesktopBridge
  }
}

export function isDesktopApp() {
  return typeof window !== 'undefined' && window.btfDesktop?.isDesktop === true
}

export function notifyDesktop(input: DesktopNotifyInput) {
  if (!isDesktopApp() || !window.btfDesktop?.notify) return false
  window.btfDesktop.notify({
    title: input.title,
    body: input.body ?? undefined,
    href: input.href,
  })
  return true
}

export function setDockBadge(count: number) {
  if (!isDesktopApp() || !window.btfDesktop?.setBadge) return
  window.btfDesktop.setBadge(Math.max(0, Math.floor(count)))
}

export function bounceDock(mode: 'informational' | 'critical' = 'informational') {
  if (!isDesktopApp() || !window.btfDesktop?.bounce) return
  window.btfDesktop.bounce(mode)
}

export function cancelDockBounce() {
  if (!isDesktopApp()) return
  window.btfDesktop?.cancelBounce?.()
}
