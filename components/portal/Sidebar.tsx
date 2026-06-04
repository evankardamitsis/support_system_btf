'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Ticket, BarChart2, X } from 'lucide-react'

const nav = [
  { label: 'My Tickets', href: '/portal/tickets', icon: Ticket },
  { label: 'Retainer', href: '/portal/retainer', icon: BarChart2 },
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
}: {
  userName?: string
  userEmail?: string
  onClose?: () => void
}) {
  const pathname = usePathname()
  const ini = initials(userName, userEmail)

  return (
    <aside className="dash-sidebar flex flex-col h-full relative">
      {onClose && (
        <button
          onClick={onClose}
          className="lg:hidden absolute top-3 right-3 p-1 dash-meta hover:opacity-80"
          aria-label="Close menu"
        >
          <X size={16} />
        </button>
      )}

      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <p className="dash-nav-label">My portal</p>
        <div className="space-y-0.5">
          {nav.map(({ label, href, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={`dash-nav-link ${active ? 'is-active' : ''}`}
              >
                <Icon size={16} className="dash-nav-icon" />
                <span>{label}</span>
              </Link>
            )
          })}
        </div>
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
