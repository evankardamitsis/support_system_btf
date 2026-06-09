import { bounceDock, isDesktopApp, setDockBadge, type DesktopNotifyInput } from '@/lib/desktop/bridge'

export type { DesktopNotifyInput }

let commsUnread = 0
let opsUnread = 0

function syncDockBadge() {
  if (!isDesktopApp()) return
  setDockBadge(commsUnread + opsUnread)
}

export function setDesktopCommsUnread(count: number) {
  commsUnread = Math.max(0, count)
  syncDockBadge()
}

export function setDesktopOpsUnread(count: number) {
  opsUnread = Math.max(0, count)
  syncDockBadge()
}

export function alertDesktopUser() {
  if (!isDesktopApp()) return
  bounceDock()
}
