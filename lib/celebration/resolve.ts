import { fireCelebrationConfetti } from '@/lib/celebration/confetti'

/** Phil Anselmo thumbs-up — https://tenor.com/view/thumbs-up-approve-pantera-philip-phil-anselmo-gif-17738792 */
export const RESOLVE_CELEBRATION_GIF =
  process.env.NEXT_PUBLIC_RESOLVE_CELEBRATION_GIF ??
  'https://media.tenor.com/QFNIySJpWJIAAAAC/thumbs-up-approve.gif'

export const RESOLVE_CELEBRATION_EVENT = 'btf:resolve-celebration'
const PENDING_CELEBRATION_KEY = 'btf-pending-resolve-celebration'

/** Delay so native <dialog> top-layer closes before the overlay renders. */
export const RESOLVE_CELEBRATION_DELAY_MS = 160

export async function fireResolveConfetti(): Promise<void> {
  await fireCelebrationConfetti()
}

function markPendingCelebration(): void {
  try {
    sessionStorage.setItem(PENDING_CELEBRATION_KEY, String(Date.now()))
  } catch {
    // Private mode / blocked storage — event path still works.
  }
}

export function shouldShowPendingCelebration(): boolean {
  try {
    const pending = sessionStorage.getItem(PENDING_CELEBRATION_KEY)
    if (!pending) return false
    const age = Date.now() - Number(pending)
    if (Number.isNaN(age) || age > 8000) {
      sessionStorage.removeItem(PENDING_CELEBRATION_KEY)
      return false
    }
    return true
  } catch {
    return false
  }
}

export function clearPendingCelebration(): void {
  try {
    sessionStorage.removeItem(PENDING_CELEBRATION_KEY)
  } catch {
    // ignore
  }
}

/** Call after a ticket is successfully resolved (survives router.refresh). */
export function triggerResolveCelebration(): void {
  if (typeof window === 'undefined') return

  markPendingCelebration()

  window.setTimeout(() => {
    void fireResolveConfetti()
    window.dispatchEvent(new CustomEvent(RESOLVE_CELEBRATION_EVENT))
  }, RESOLVE_CELEBRATION_DELAY_MS)
}
