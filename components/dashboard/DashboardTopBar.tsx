'use client'

import { usePathname, useRouter } from 'next/navigation'
import { ChevronDown, LogOut } from 'lucide-react'
import { MenuToggleIcon } from '@/components/dashboard/MenuToggleIcon'
import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import Link from 'next/link'
import { ProductAreaSwitcher } from '@/components/admin/ProductAreaSwitcher'
import { getAdminProductArea, getAdminProductAreaConfig } from '@/lib/admin/product-areas'
import { DashboardSearch } from './DashboardSearch'

function initials(n?: string, e?: string) {
  if (n) {
    const p = n.trim().split(' ')
    return ((p[0]?.[0] ?? '') + (p[1]?.[0] ?? '')).toUpperCase()
  }
  return e?.[0]?.toUpperCase() ?? '?'
}

export function DashboardTopBar({
  variant,
  userName,
  userEmail,
  userRole,
  menuOpen = false,
  onMenuClick,
}: {
  variant: 'admin' | 'portal'
  userName?: string
  userEmail?: string
  userRole?: string
  menuOpen?: boolean
  onMenuClick: () => void
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const ini = initials(userName, userEmail)
  const adminArea = variant === 'admin' ? getAdminProductArea(pathname) : null
  const homeHref =
    variant === 'admin'
      ? getAdminProductAreaConfig(pathname).homeHref
      : '/portal/tickets'

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <header className="dash-topbar flex items-center px-4 lg:px-5 shrink-0 gap-4">
      <button
        type="button"
        onClick={onMenuClick}
        className={`dash-menu-toggle-btn shrink-0${menuOpen ? ' is-open' : ''}`}
        aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={menuOpen}
        aria-controls="dash-sidebar"
      >
        <MenuToggleIcon open={menuOpen} />
      </button>

      <div className="flex items-center shrink-0 gap-2 dash-topbar-brand min-w-0">
        <Link href={homeHref} className="dash-topbar-brand-link shrink-0" aria-label="Home">
          <Image
            src="/btf-wordmark.svg"
            alt="BTF"
            width={96}
            height={14}
            className="dash-topbar-logo"
            priority
          />
        </Link>
        {variant === 'admin' ? <ProductAreaSwitcher userRole={userRole} /> : null}
      </div>

      <div className="flex-1 flex justify-center min-w-0">
        {variant === 'admin' && adminArea === 'ops' ? null : (
          <DashboardSearch
            variant={variant}
            placeholder={variant === 'admin' ? 'Search tickets, clients…' : 'Search tickets…'}
          />
        )}
      </div>

      <div className="relative shrink-0" ref={ref}>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="dash-topbar-account"
          aria-expanded={open}
          aria-haspopup="menu"
        >
          <div className="dash-avatar dash-avatar--lg">{ini}</div>
          <span className="hidden sm:block dash-topbar-account-name">
            {userName?.split(' ')[0] ?? userEmail}
          </span>
          <ChevronDown size={14} className="dash-topbar-chevron" aria-hidden />
        </button>

        {open ? (
          <div className="dash-topbar-menu anim-fade" role="menu">
            <div className="dash-topbar-menu-head">
              <p className="dash-topbar-menu-name">{userName}</p>
              <p className="dash-topbar-menu-email">{userEmail}</p>
            </div>
            <button
              type="button"
              role="menuitem"
              onClick={handleLogout}
              className="dash-topbar-menu-logout"
            >
              <LogOut size={14} />
              Sign out
            </button>
          </div>
        ) : null}
      </div>
    </header>
  )
}
