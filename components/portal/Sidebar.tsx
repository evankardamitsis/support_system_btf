'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SidebarBrand } from '@/components/dashboard/SidebarBrand'

const nav = [
  { label: 'My Tickets', href: '/portal/tickets', onboarding: 'nav-tickets' },
  { label: 'My Plan', href: '/portal/retainer', onboarding: 'nav-plan' },
  { label: 'Team', href: '/portal/team', onboarding: 'nav-team' },
]

function initials(name?: string, email?: string) {
  if (name) {
    const p = name.trim().split(' ')
    return ((p[0]?.[0] ?? '') + (p[1]?.[0] ?? '')).toUpperCase()
  }
  return email?.[0]?.toUpperCase() ?? '?'
}

export function PortalSidebar({
  userName,
  userEmail,
  onClose,
  onShowTour,
}: {
  userName?: string
  userEmail?: string
  onClose?: () => void
  onShowTour?: () => void
}) {
  const pathname = usePathname()
  const ini = initials(userName, userEmail)

  return (
    <aside id="dash-sidebar" className="dash-sidebar flex flex-col h-full relative">
      <SidebarBrand variant="portal" onNavigate={onClose} />

      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          className="dash-sidebar-close"
          aria-label="Close menu"
        >
          ×
        </button>
      ) : null}

      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <p className="dash-nav-label">My portal</p>
        <div className="space-y-0.5">
          {nav.map(({ label, href, onboarding }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                data-onboarding={onboarding}
                className={`dash-nav-link ${active ? 'is-active' : ''}`}
              >
                <span className="dash-nav-text">{label}</span>
              </Link>
            )
          })}
        </div>

        {onShowTour ? (
          <button
            type="button"
            className="portal-tour-again-btn"
            onClick={() => {
              onShowTour()
              onClose?.()
            }}
          >
            Show tour again
          </button>
        ) : null}
      </nav>

      <div className="px-3 pb-4">
        <div className="dash-user-card">
          <div className="dash-avatar w-8 h-8 text-[11px]">{ini}</div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate leading-none" style={{ color: 'var(--text-1)' }}>
              {userName ?? userEmail}
            </p>
            <p className="dash-meta mt-0.5">Client</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
