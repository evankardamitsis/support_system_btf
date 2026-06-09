import { alertDesktopUser, type DesktopNotifyInput } from '@/lib/desktop/badge'
import { notifyDesktop } from '@/lib/desktop/bridge'
import { shouldUseDesktopAlerts } from '@/lib/desktop/focus'

export function notifyIfUnfocused(input: DesktopNotifyInput) {
  if (!shouldUseDesktopAlerts()) return false
  const sent = notifyDesktop(input)
  if (sent) {
    alertDesktopUser()
  }
  return sent
}
