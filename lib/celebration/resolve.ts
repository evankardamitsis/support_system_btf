/** Phil Anselmo thumbs-up — https://tenor.com/view/thumbs-up-approve-pantera-philip-phil-anselmo-gif-17738792 */
export const RESOLVE_CELEBRATION_GIF =
  process.env.NEXT_PUBLIC_RESOLVE_CELEBRATION_GIF ??
  'https://media.tenor.com/QFNIySJpWJIAAAAC/thumbs-up-approve.gif'

const CONFETTI_COLORS = ['#e8ff47', '#4ade80', '#fb923c', '#ffffff', '#a78bfa']

export async function fireResolveConfetti(): Promise<void> {
  const confetti = (await import('canvas-confetti')).default
  const duration = 2400
  const end = Date.now() + duration

  confetti({
    particleCount: 90,
    spread: 78,
    startVelocity: 42,
    origin: { y: 0.58 },
    colors: CONFETTI_COLORS,
    zIndex: 300,
  })

  const frame = () => {
    confetti({
      particleCount: 2,
      angle: 60,
      spread: 52,
      origin: { x: 0, y: 0.55 },
      colors: CONFETTI_COLORS,
      zIndex: 300,
    })
    confetti({
      particleCount: 2,
      angle: 120,
      spread: 52,
      origin: { x: 1, y: 0.55 },
      colors: CONFETTI_COLORS,
      zIndex: 300,
    })
    if (Date.now() < end) requestAnimationFrame(frame)
  }

  frame()
}
