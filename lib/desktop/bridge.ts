type DesktopNotifyInput = {
  title: string
  body?: string | null
  href?: string
}

type BtfDesktopBridge = {
  platform: string
  isDesktop: boolean
  notify: (input: DesktopNotifyInput) => void
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
