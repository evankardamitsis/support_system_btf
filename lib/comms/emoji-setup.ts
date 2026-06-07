'use client'

import { init, SearchIndex } from 'emoji-mart'
import data from '@emoji-mart/data'

let initialized = false

export function ensureEmojiMart() {
  if (initialized) return
  init({ data })
  initialized = true
}

export { SearchIndex }
