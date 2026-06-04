'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Ticket, Users, Clock, X } from 'lucide-react'

interface AdminSidebarProps {
  userName?: string
  userEmail?: string
  userRole?: string
  onClose?: () => void
}

const nav = [
  { label: 'Tickets', href: '/admin/tickets', icon: Ticket },
  { label: 'Clients', href: '/admin/clients', icon: Users },
  { label: 'Retainers', href: '/admin/retainers', icon: Clock },
]

function initials(n?: string, e?: string) {
  if (n) {
    const p = n.trim().split(' ')
    return ((p[0]?.[0] ?? '') + (p[1]?.[0] ?? '')).toUpperCase()
  }
  return e?.[0]?.toUpperCase() ?? '?'
}

export function AdminSidebar({ userName, userEmail, userRole, onClose }: AdminSidebarProps) {
  const pathname = usePathname()
  const ini = initials(userName, userEmail)

  return (
    <aside className="dash-sidebar flex flex-col h-full select-none relative">
      {onClose && (
        <button
          onClick={onClose}
          className="lg:hidden absolute top-3 right-3 p-1 dash-meta hover:opacity-80"
          aria-label="Close menu"
        >
          <X size={15} />
        </button>
      )}

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="dash-nav-label">Navigation</p>
        {nav.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={`dash-nav-link ${active ? 'is-active' : ''}`}
            >
              <Icon size={15} className="dash-nav-icon" />
              <span>{label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="px-3 pb-4">
        <div className="dash-user-card">
          <div className="dash-avatar w-7 h-7 text-[10px]">{ini}</div>
          <div className="min-w-0">
            <p className="text-xs font-medium truncate leading-none" style={{ color: 'var(--text-1)' }}>
              {userName ?? userEmail}
            </p>
            {userRole && (
              <p className="dash-meta mt-0.5 uppercase tracking-wider">{userRole}</p>
            )}
          </div>
        </div>
      </div>
    </aside>
  )
}
