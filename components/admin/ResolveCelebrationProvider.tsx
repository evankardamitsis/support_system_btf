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
  fireResolveConfetti,
  RESOLVE_CELEBRATION_GIF,
} from '@/lib/celebration/resolve'

const CELEBRATION_MS = 2800

const ResolveCelebrationContext = createContext<(() => void) | null>(null)

export function useResolveCelebration(): () => void {
  const celebrate = useContext(ResolveCelebrationContext)
  return celebrate ?? (() => {})
}

export function ResolveCelebrationProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [gifFailed, setGifFailed] = useState(false)

  useEffect(() => setMounted(true), [])

  const dismiss = useCallback(() => setActive(false), [])

  const celebrate = useCallback(() => {
    setGifFailed(false)
    setActive(true)
    void fireResolveConfetti()
  }, [])

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
    <ResolveCelebrationContext.Provider value={celebrate}>
      {children}
      {mounted && active
        ? createPortal(
            <div className="resolve-celebration" role="presentation" onClick={dismiss}>
              <div className="resolve-celebration-backdrop" aria-hidden />
              <div className="resolve-celebration-content">
                {!gifFailed ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={RESOLVE_CELEBRATION_GIF}
                    alt=""
                    className="resolve-celebration-gif"
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
