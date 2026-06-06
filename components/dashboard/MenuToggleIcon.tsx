'use client'

export function MenuToggleIcon({ open }: { open: boolean }) {
  return (
    <span className={`dash-menu-toggle${open ? ' is-open' : ''}`} aria-hidden>
      <span className="dash-menu-toggle-line dash-menu-toggle-line--top" />
      <span className="dash-menu-toggle-line dash-menu-toggle-line--mid" />
      <span className="dash-menu-toggle-line dash-menu-toggle-line--bot" />
    </span>
  )
}
