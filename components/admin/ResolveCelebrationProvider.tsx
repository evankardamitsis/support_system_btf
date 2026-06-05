'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import {
  RESOLVE_CELEBRATION_EVENT,
  RESOLVE_CELEBRATION_GIF,
  clearPendingCelebration,
  shouldShowPendingCelebration,
  triggerResolveCelebration,
} from '@/lib/celebration/resolve'

const CELEBRATION_MS = 3200

const ResolveCelebrationContext = createContext<(() => void) | null>(null)

export function useResolveCelebration(): () => void {
  const celebrate = useContext(ResolveCelebrationContext)
  return celebrate ?? triggerResolveCelebration
}

export function ResolveCelebrationProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [gifFailed, setGifFailed] = useState(false)

  const show = useCallback(() => {
    setGifFailed(false)
    setActive(true)
    clearPendingCelebration()
  }, [])

  const dismiss = useCallback(() => setActive(false), [])

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!mounted) return

    if (shouldShowPendingCelebration()) {
      show()
    }

    function onCelebrate() {
      show()
    }

    window.addEventListener(RESOLVE_CELEBRATION_EVENT, onCelebrate)
    return () => window.removeEventListener(RESOLVE_CELEBRATION_EVENT, onCelebrate)
  }, [mounted, show])

  useEffect(() => {
    if (!active) return
    const timer = window.setTimeout(dismiss, CELEBRATION_MS)
    return () => window.clearTimeout(timer)
  }, [active, dismiss])

  useEffect(() => {
    if (!active) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') dismiss()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [active, dismiss])

  return (
    <ResolveCelebrationContext.Provider value={triggerResolveCelebration}>
      {children}
      {mounted && active
        ? createPortal(
            <div
              className="resolve-celebration"
              data-theme="dashboard"
              role="presentation"
              onClick={dismiss}
            >
              <div className="resolve-celebration-backdrop" aria-hidden />
              <div className="resolve-celebration-content">
                {!gifFailed ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={RESOLVE_CELEBRATION_GIF}
                    alt=""
                    className="resolve-celebration-gif"
                    referrerPolicy="no-referrer"
                    onError={() => setGifFailed(true)}
                  />
                ) : (
                  <p className="resolve-celebration-fallback" aria-hidden>
                    Resolved!
                  </p>
                )}
              </div>
            </div>,
            document.body
          )
        : null}
    </ResolveCelebrationContext.Provider>
  )
}
