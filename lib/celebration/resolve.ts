/** Phil Anselmo thumbs-up — https://tenor.com/view/thumbs-up-approve-pantera-philip-phil-anselmo-gif-17738792 */
export const RESOLVE_CELEBRATION_GIF =
  process.env.NEXT_PUBLIC_RESOLVE_CELEBRATION_GIF ??
  'https://media.tenor.com/QFNIySJpWJIAAAAC/thumbs-up-approve.gif'

export const RESOLVE_CELEBRATION_EVENT = 'btf:resolve-celebration'
const PENDING_CELEBRATION_KEY = 'btf-pending-resolve-celebration'

const CONFETTI_COLORS = ['#e8ff47', '#4ade80', '#fb923c', '#ffffff', '#a78bfa']
const CONFETTI_Z_INDEX = 100_000

/** Delay so native <dialog> top-layer closes before the overlay renders. */
export const RESOLVE_CELEBRATION_DELAY_MS = 160

export async function fireResolveConfetti(): Promise<void> {
  const confetti = (await import('canvas-confetti')).default
  const duration = 2600
  const end = Date.now() + duration

  confetti({
    particleCount: 100,
    spread: 80,
    startVelocity: 44,
    origin: { y: 0.55 },
    colors: CONFETTI_COLORS,
    zIndex: CONFETTI_Z_INDEX,
    disableForReducedMotion: true,
  })

  const frame = () => {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.5 },
      colors: CONFETTI_COLORS,
      zIndex: CONFETTI_Z_INDEX,
      disableForReducedMotion: true,
    })
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.5 },
      colors: CONFETTI_COLORS,
      zIndex: CONFETTI_Z_INDEX,
      disableForReducedMotion: true,
    })
    if (Date.now() < end) requestAnimationFrame(frame)
  }

  frame()
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
