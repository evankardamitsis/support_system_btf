import type { ColorMode } from '@/lib/ui/color-mode'

export function getStreamChatTheme(mode: ColorMode) {
  return mode === 'light' ? 'str-chat__theme-light' : 'str-chat__theme-dark'
}
