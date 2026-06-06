let audioContext: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null

  if (!audioContext) {
    const AudioCtx =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return null
    audioContext = new AudioCtx()
  }

  return audioContext
}

export async function primeNotificationAudio() {
  const ctx = getAudioContext()
  if (!ctx || ctx.state === 'running') return
  try {
    await ctx.resume()
  } catch {
    // Browser may block until a user gesture; a later click will retry.
  }
}

function playLuxuryChime(ctx: AudioContext, start: number) {
  const master = ctx.createGain()
  master.gain.setValueAtTime(0.0001, start)
  master.gain.exponentialRampToValueAtTime(0.11, start + 0.035)
  master.gain.exponentialRampToValueAtTime(0.035, start + 0.2)
  master.gain.exponentialRampToValueAtTime(0.0001, start + 0.62)

  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(3200, start)
  filter.frequency.exponentialRampToValueAtTime(780, start + 0.5)
  filter.Q.setValueAtTime(0.85, start)
  filter.connect(master)
  master.connect(ctx.destination)

  const playBellTone = (
    frequency: number,
    at: number,
    duration: number,
    volume: number
  ) => {
    const toneGain = ctx.createGain()
    toneGain.gain.setValueAtTime(0.0001, at)
    toneGain.gain.exponentialRampToValueAtTime(volume, at + 0.012)
    toneGain.gain.exponentialRampToValueAtTime(0.0001, at + duration)
    toneGain.connect(filter)

    const body = ctx.createOscillator()
    body.type = 'triangle'
    body.frequency.setValueAtTime(frequency, at)
    body.connect(toneGain)

    const chorus = ctx.createOscillator()
    chorus.type = 'triangle'
    chorus.frequency.setValueAtTime(frequency * 1.004, at)
    const chorusGain = ctx.createGain()
    chorusGain.gain.setValueAtTime(0.38, at)
    chorus.connect(chorusGain)
    chorusGain.connect(toneGain)

    const shimmer = ctx.createOscillator()
    shimmer.type = 'sine'
    shimmer.frequency.setValueAtTime(frequency * 2.02, at)
    const shimmerGain = ctx.createGain()
    shimmerGain.gain.setValueAtTime(0.14, at)
    shimmer.connect(shimmerGain)
    shimmerGain.connect(toneGain)

    body.start(at)
    chorus.start(at)
    shimmer.start(at)
    body.stop(at + duration)
    chorus.stop(at + duration)
    shimmer.stop(at + duration)
  }

  // Ascending D-major sparkle: F#5 → A5 → D6
  playBellTone(739.99, start, 0.3, 0.52)
  playBellTone(880, start + 0.075, 0.34, 0.42)
  playBellTone(1174.66, start + 0.155, 0.42, 0.28)
}

export async function playNotificationChime() {
  if (typeof window === 'undefined') return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  if (document.visibilityState !== 'visible') return

  const ctx = getAudioContext()
  if (!ctx) return

  try {
    if (ctx.state === 'suspended') {
      await ctx.resume()
    }
    if (ctx.state !== 'running') return
  } catch {
    return
  }

  playLuxuryChime(ctx, ctx.currentTime)
}
