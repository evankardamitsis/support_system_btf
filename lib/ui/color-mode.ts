export type ColorMode = 'dark' | 'light'

export const COLOR_MODE_STORAGE_KEY = 'btf-color-mode'

export function getStoredColorMode(): ColorMode {
  if (typeof window === 'undefined') return 'dark'
  try {
    const stored = localStorage.getItem(COLOR_MODE_STORAGE_KEY)
    return stored === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

export function applyColorMode(mode: ColorMode) {
  document.documentElement.dataset.colorMode = mode
}

export function storeColorMode(mode: ColorMode) {
  try {
    localStorage.setItem(COLOR_MODE_STORAGE_KEY, mode)
  } catch {
    // ignore
  }
}
