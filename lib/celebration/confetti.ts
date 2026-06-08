const CONFETTI_COLORS = ['#e8ff47', '#4ade80', '#fb923c', '#ffffff', '#a78bfa']
const CONFETTI_Z_INDEX = 100_000

export async function fireCelebrationConfetti(): Promise<void> {
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
