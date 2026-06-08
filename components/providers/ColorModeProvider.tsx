'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import {
  applyColorMode,
  getStoredColorMode,
  storeColorMode,
  type ColorMode,
} from '@/lib/ui/color-mode'

const COLOR_MODE_CHANGE_EVENT = 'btf-color-mode-change'

type ColorModeContextValue = {
  mode: ColorMode
  setMode: (mode: ColorMode) => void
  toggleMode: () => void
}

const ColorModeContext = createContext<ColorModeContextValue | null>(null)

function readColorMode(): ColorMode {
  if (typeof document !== 'undefined') {
    const datasetMode = document.documentElement.dataset.colorMode
    if (datasetMode === 'light' || datasetMode === 'dark') {
      return datasetMode
    }
  }
  return getStoredColorMode()
}

function subscribe(onStoreChange: () => void) {
  const handler = () => onStoreChange()
  window.addEventListener(COLOR_MODE_CHANGE_EVENT, handler)
  window.addEventListener('storage', handler)
  return () => {
    window.removeEventListener(COLOR_MODE_CHANGE_EVENT, handler)
    window.removeEventListener('storage', handler)
  }
}

function publishColorMode(mode: ColorMode) {
  applyColorMode(mode)
  storeColorMode(mode)
  window.dispatchEvent(new Event(COLOR_MODE_CHANGE_EVENT))
}

export function ColorModeProvider({ children }: { children: ReactNode }) {
  const mode = useSyncExternalStore(subscribe, readColorMode, () => 'dark' as ColorMode)

  const setMode = useCallback((next: ColorMode) => {
    publishColorMode(next)
  }, [])

  const toggleMode = useCallback(() => {
    const next: ColorMode = readColorMode() === 'dark' ? 'light' : 'dark'
    publishColorMode(next)
  }, [])

  const value = useMemo(
    () => ({
      mode,
      setMode,
      toggleMode,
    }),
    [mode, setMode, toggleMode],
  )

  return <ColorModeContext.Provider value={value}>{children}</ColorModeContext.Provider>
}

export function useColorMode() {
  const context = useContext(ColorModeContext)
  if (!context) {
    throw new Error('useColorMode must be used within ColorModeProvider')
  }
  return context
}
