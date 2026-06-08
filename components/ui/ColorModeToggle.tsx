'use client'

import { Moon, Sun } from 'lucide-react'
import { useColorMode } from '@/components/providers/ColorModeProvider'

export function ColorModeToggle({
  className = '',
  compact = false,
}: {
  className?: string
  compact?: boolean
}) {
  const { mode, toggleMode } = useColorMode()
  const isDark = mode === 'dark'

  return (
    <button
      type="button"
      className={`color-mode-toggle${compact ? ' color-mode-toggle--compact' : ''}${className ? ` ${className}` : ''}`}
      onClick={toggleMode}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
      suppressHydrationWarning
    >
      {isDark ? <Sun size={compact ? 15 : 16} aria-hidden /> : <Moon size={compact ? 15 : 16} aria-hidden />}
      {!compact ? <span>{isDark ? 'Light' : 'Dark'}</span> : null}
    </button>
  )
}
