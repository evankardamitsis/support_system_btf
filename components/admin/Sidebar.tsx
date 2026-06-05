'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SidebarBrand } from '@/components/dashboard/SidebarBrand'
import { getAdminProductAreaConfig } from '@/lib/admin/product-areas'

interface AdminSidebarProps {
  userName?: string
  userEmail?: string
  userRole?: string
  onClose?: () => void
}

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
  const nav = getAdminProductAreaConfig(pathname).nav

  return (
    <aside className="dash-sidebar flex flex-col h-full select-none relative">
      <SidebarBrand variant="admin" userRole={userRole} onNavigate={onClose} />

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

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="dash-nav-label">Navigation</p>
        {nav
          .filter(item => !item.adminOnly || userRole === 'admin')
          .map(({ label, href }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={`dash-nav-link ${active ? 'is-active' : ''}`}
            >
              <span className="dash-nav-text">{label}</span>
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
            {userRole ? (
              <p className="dash-meta mt-0.5 uppercase tracking-wider">{userRole}</p>
            ) : null}
          </div>
        </div>
      </div>
    </aside>
  )
}
