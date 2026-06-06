'use client'

import { usePathname, useRouter } from 'next/navigation'
import { ChevronDown, LogOut, Search, X } from 'lucide-react'
import { MenuToggleIcon } from '@/components/dashboard/MenuToggleIcon'
import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import Link from 'next/link'
import { ProductAreaSwitcher } from '@/components/admin/ProductAreaSwitcher'
import {
  canAccessOps,
  getAdminProductArea,
  getAdminProductAreaConfig,
} from '@/lib/admin/product-areas'
import { DashboardSearch } from './DashboardSearch'
import { OpsDashboardSearch } from './OpsDashboardSearch'
import { OpsNotificationBell } from './OpsNotificationBell'

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
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const searchWrapRef = useRef<HTMLDivElement>(null)
  const ini = initials(userName, userEmail)
  const adminArea = variant === 'admin' ? getAdminProductArea(pathname) : null
  const showNotifications = variant === 'admin' && canAccessOps(userRole)
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

  useEffect(() => {
    setMobileSearchOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!mobileSearchOpen) return

    const frame = window.requestAnimationFrame(() => {
      searchWrapRef.current?.querySelector<HTMLInputElement>('.dash-search-input')?.focus()
    })

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileSearchOpen(false)
    }
    window.addEventListener('keydown', onKey)

    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('keydown', onKey)
    }
  }, [mobileSearchOpen])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const search =
    variant === 'admin' && adminArea === 'ops' ? (
      <OpsDashboardSearch
        isAdmin={userRole === 'admin'}
        placeholder="Search projects, offers, hosting…"
      />
    ) : (
      <DashboardSearch
        variant={variant}
        placeholder={variant === 'admin' ? 'Search tickets, clients…' : 'Search tickets…'}
      />
    )

  return (
    <header
      className={`dash-topbar shrink-0${mobileSearchOpen ? ' dash-topbar--search-open' : ''}`}
    >
      <button
        type="button"
        onClick={onMenuClick}
        className={`dash-topbar-menu-btn dash-menu-toggle-btn${menuOpen ? ' is-open' : ''}`}
        aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={menuOpen}
        aria-controls="dash-sidebar"
      >
        <MenuToggleIcon open={menuOpen} />
      </button>

      <div className="dash-topbar-brand">
        <Link href={homeHref} className="dash-topbar-brand-link" aria-label="Home">
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

      <div className="dash-topbar-search" ref={searchWrapRef}>
        <div className="dash-topbar-search-panel">
          {search}
          <button
            type="button"
            className="dash-topbar-search-close"
            aria-label="Close search"
            onClick={() => setMobileSearchOpen(false)}
          >
            <X size={16} aria-hidden />
          </button>
        </div>
      </div>

      <div className="dash-topbar-actions">
        <button
          type="button"
          className={`dash-topbar-search-toggle${mobileSearchOpen ? ' is-active' : ''}`}
          aria-label={mobileSearchOpen ? 'Close search' : 'Open search'}
          aria-expanded={mobileSearchOpen}
          onClick={() => {
            setOpen(false)
            setMobileSearchOpen(prev => !prev)
          }}
        >
          <Search size={18} aria-hidden />
        </button>
        {showNotifications ? <OpsNotificationBell /> : null}
        <div className="dash-topbar-account-wrap" ref={ref}>
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="dash-topbar-account"
            aria-expanded={open}
            aria-haspopup="menu"
          >
            <div className="dash-avatar dash-avatar--lg">{ini}</div>
            <span className="dash-topbar-account-name">
              {userName?.split(' ')[0] ?? userEmail}
            </span>
            <ChevronDown size={14} className="dash-topbar-chevron" aria-hidden />
          </button>

          {open ? (
            <div className="dash-topbar-account-menu anim-fade" role="menu">
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
      </div>
    </header>
  )
}
