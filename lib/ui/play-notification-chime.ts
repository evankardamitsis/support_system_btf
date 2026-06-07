const CHIME_VOLUME = 0.44
const CHIME_VERSION = 11
const HUDDLE_CHIME_VERSION = 1

let chimeSrc: string | null = null
let cachedVersion = 0
let sharedAudio: HTMLAudioElement | null = null
let primed = false
let pendingChime = false
let huddleChimeSrc: string | null = null
let huddleCachedVersion = 0
let huddleSharedAudio: HTMLAudioElement | null = null
let pendingHuddleChime = false
let initialized = false

type ChimeTone = {
  freq: number
  start: number
  duration: number
  gain: number
  overtone?: number
}

const NOTE_SPACING = 0.2
const NOTE_DURATION = 0.18
const NOTE_OVERTONE = 0.07

function midiToFreq(midi: number) {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

// Master of Puppets intro: opening power-chord roots (+1 octave).
const MOP_INTRO_MIDI = [
  64, // E4 — E5 power chord
  62, // D4 — D5
] as const

const CHIME_TONES: ChimeTone[] = MOP_INTRO_MIDI.map((midi, index) => ({
  freq: midiToFreq(midi),
  start: index * NOTE_SPACING,
  duration: NOTE_DURATION,
  gain: 0.5,
  overtone: NOTE_OVERTONE,
}))

const HUDDLE_CHIME_MIDI = [67, 71, 74] as const

const HUDDLE_CHIME_TONES: ChimeTone[] = HUDDLE_CHIME_MIDI.map((midi, index) => ({
  freq: midiToFreq(midi),
  start: index * 0.14,
  duration: 0.16,
  gain: 0.46,
  overtone: 0.05,
}))

function smoothStep(t: number) {
  const clamped = Math.max(0, Math.min(1, t))
  return clamped * clamped * (3 - 2 * clamped)
}

function toneEnvelope(elapsed: number, duration: number) {
  if (elapsed < 0 || elapsed >= duration) return 0

  const attackMs = 0.008
  const releaseMs = 0.028
  const body = smoothStep(elapsed / attackMs) * Math.exp(-elapsed * 10)

  if (elapsed <= duration - releaseMs) return body

  const release = smoothStep((duration - elapsed) / releaseMs)
  return body * release
}

function toneAt(time: number, tone: ChimeTone) {
  const elapsed = time - tone.start
  const envelope = toneEnvelope(elapsed, tone.duration)
  if (envelope <= 0) return 0

  const phase = 2 * Math.PI * tone.freq * time
  const fundamental = Math.sin(phase)
  const overtone =
    tone.overtone != null ? Math.sin(phase * 2) * tone.overtone : 0

  return (fundamental + overtone) * tone.gain * envelope
}

function applyReverbTail(
  dry: Float32Array,
  sampleRate: number,
  tailSec = 0.45,
) {
  const tailSamples = Math.floor(sampleRate * tailSec)
  const length = dry.length + tailSamples
  const output = new Float32Array(length)

  const combDelays = [
    Math.floor(sampleRate * 0.0297),
    Math.floor(sampleRate * 0.0371),
    Math.floor(sampleRate * 0.0411),
    Math.floor(sampleRate * 0.0437),
  ]
  const combBuffers = combDelays.map((delay) => new Float32Array(delay))
  const combIndices = combDelays.map(() => 0)
  const combFeedback = 0.74
  const wetMix = 0.3
  const dampStates = combDelays.map(() => 0)

  for (let i = 0; i < length; i++) {
    const input = i < dry.length ? dry[i]! : 0
    let wet = 0

    for (let c = 0; c < combDelays.length; c++) {
      const delay = combDelays[c]!
      const buf = combBuffers[c]!
      const idx = combIndices[c]!
      const delayed = buf[idx]!
      const damp = dampStates[c]!
      const filtered = delayed * 0.72 + damp * 0.28
      dampStates[c] = filtered
      buf[idx] = input + filtered * combFeedback
      combIndices[c] = (idx + 1) % delay
      wet += delayed
    }

    const drySample = i < dry.length ? dry[i]! : 0
    output[i] = drySample + (wet / combDelays.length) * wetMix
  }

  const fadeStart = dry.length
  for (let i = fadeStart; i < length; i++) {
    const fade = smoothStep((length - i) / tailSamples)
    output[i] = output[i]! * fade
  }

  output[length - 1] = 0
  return output
}

function buildChimeSrcFromTones(tones: ChimeTone[]) {
  const sampleRate = 22050
  const lastTone = tones[tones.length - 1]!
  const dryDuration = lastTone.start + lastTone.duration + 0.02
  const drySamples = Math.floor(sampleRate * dryDuration)
  const dry = new Float32Array(drySamples)

  for (let i = 0; i < drySamples; i++) {
    const time = i / sampleRate
    let sample = 0
    for (const tone of tones) {
      sample += toneAt(time, tone)
    }
    dry[i] = sample
  }

  const samples = applyReverbTail(dry, sampleRate)
  const numSamples = samples.length
  const dataSize = numSamples * 2
  const buffer = new ArrayBuffer(44 + dataSize)
  const view = new DataView(buffer)

  const writeString = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) {
      view.setUint8(offset + i, value.charCodeAt(i))
    }
  }

  writeString(0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeString(36, 'data')
  view.setUint32(40, dataSize, true)

  let peak = 0
  for (let i = 0; i < numSamples; i++) {
    peak = Math.max(peak, Math.abs(samples[i]!))
  }

  const normalize = peak > 0 ? 0.88 / peak : 1

  for (let i = 0; i < numSamples; i++) {
    const value = samples[i]! * normalize
    const clamped = Math.max(-1, Math.min(1, value))
    view.setInt16(44 + i * 2, Math.floor(clamped * 32767), true)
  }

  view.setInt16(44 + (numSamples - 1) * 2, 0, true)

  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!)
  }

  return `data:audio/wav;base64,${btoa(binary)}`
}

function buildChimeSrc() {
  return buildChimeSrcFromTones(CHIME_TONES)
}

function getChimeSrc() {
  if (!chimeSrc || cachedVersion !== CHIME_VERSION) {
    chimeSrc = buildChimeSrc()
    cachedVersion = CHIME_VERSION
  }
  return chimeSrc
}

function getHuddleChimeSrc() {
  if (!huddleChimeSrc || huddleCachedVersion !== HUDDLE_CHIME_VERSION) {
    huddleChimeSrc = buildChimeSrcFromTones(HUDDLE_CHIME_TONES)
    huddleCachedVersion = HUDDLE_CHIME_VERSION
  }
  return huddleChimeSrc
}

function getSharedAudio(): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null

  const src = getChimeSrc()
  if (!sharedAudio) {
    sharedAudio = new Audio(src)
    sharedAudio.preload = 'auto'
    sharedAudio.volume = CHIME_VOLUME
    return sharedAudio
  }

  if (sharedAudio.src !== src) {
    sharedAudio.src = src
    sharedAudio.load()
  }

  return sharedAudio
}

async function playChimeNow(): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error('Audio is not available')
  }
  if (document.visibilityState !== 'visible') {
    throw new Error('Tab is not visible')
  }

  const audio = getSharedAudio()
  if (!audio) throw new Error('Audio is not supported')

  audio.volume = CHIME_VOLUME
  if (!audio.paused) {
    audio.pause()
  }
  audio.currentTime = 0
  await audio.play()
  primed = true
  pendingChime = false
}

function getHuddleSharedAudio(): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null

  const src = getHuddleChimeSrc()
  if (!huddleSharedAudio) {
    huddleSharedAudio = new Audio(src)
    huddleSharedAudio.preload = 'auto'
    huddleSharedAudio.volume = CHIME_VOLUME
    return huddleSharedAudio
  }

  if (huddleSharedAudio.src !== src) {
    huddleSharedAudio.src = src
    huddleSharedAudio.load()
  }

  return huddleSharedAudio
}

async function playHuddleChimeNow(): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error('Audio is not available')
  }
  if (document.visibilityState !== 'visible') {
    throw new Error('Tab is not visible')
  }

  const audio = getHuddleSharedAudio()
  if (!audio) throw new Error('Audio is not supported')

  audio.volume = CHIME_VOLUME
  if (!audio.paused) {
    audio.pause()
  }
  audio.currentTime = 0
  await audio.play()
  primed = true
  pendingHuddleChime = false
}

function flushPendingChime() {
  if (!pendingChime) return
  void playChimeNow().catch(() => {
    pendingChime = true
  })
}

function flushPendingHuddleChime() {
  if (!pendingHuddleChime) return
  void playHuddleChimeNow().catch(() => {
    pendingHuddleChime = true
  })
}

function unlockFromGesture() {
  const audio = getSharedAudio()
  if (!audio) return

  if (!primed) {
    audio.volume = 0.001
    if (!audio.paused) {
      audio.pause()
    }
    audio.currentTime = 0
    const prime = audio.play()
    if (!prime) return
    prime
      .then(() => {
        audio.pause()
        audio.volume = CHIME_VOLUME
        audio.currentTime = 0
        primed = true
        flushPendingChime()
        flushPendingHuddleChime()
      })
      .catch(() => {
        // Still waiting for a stronger user gesture.
      })
    return
  }

  flushPendingChime()
  flushPendingHuddleChime()
}

/** Call once when the dashboard mounts — keeps audio ready for realtime notifications. */
export function initNotificationAudio() {
  if (typeof window === 'undefined' || initialized) return
  initialized = true

  getChimeSrc()
  getHuddleChimeSrc()

  for (const event of ['pointerdown', 'keydown', 'touchstart', 'mousedown'] as const) {
    window.addEventListener(event, unlockFromGesture, { capture: true, passive: true })
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      flushPendingChime()
      flushPendingHuddleChime()
    }
  })
}

export function playNotificationChime() {
  void playChimeNow().catch(() => {
    pendingChime = true
  })
}

export function playHuddleChime() {
  void playHuddleChimeNow().catch(() => {
    pendingHuddleChime = true
  })
}

/** User-initiated test — runs inside a click handler so browsers allow playback. */
export async function testNotificationChime(): Promise<{ ok: boolean; error?: string }> {
  try {
    await playChimeNow()
    return { ok: true }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Could not play notification sound'
    return { ok: false, error: message }
  }
}
