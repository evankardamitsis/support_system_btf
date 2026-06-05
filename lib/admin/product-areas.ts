import { isBtfStaffRole } from '@/lib/auth/staff'

export type AdminProductArea = 'support' | 'ops'

export type AdminNavItem = {
  label: string
  href: string
  adminOnly?: boolean
}

export type AdminProductAreaConfig = {
  id: AdminProductArea
  label: string
  homeHref: string
  nav: AdminNavItem[]
}

export const ADMIN_PRODUCT_AREAS: Record<AdminProductArea, AdminProductAreaConfig> = {
  support: {
    id: 'support',
    label: 'Support',
    homeHref: '/admin/tickets',
    nav: [
      { label: 'Tickets', href: '/admin/tickets' },
      { label: 'Clients', href: '/admin/clients' },
      { label: 'Retainers', href: '/admin/retainers', adminOnly: true },
      { label: 'Team', href: '/admin/team' },
    ],
  },
  ops: {
    id: 'ops',
    label: 'Ops',
    homeHref: '/admin/ops/financial-offers',
    nav: [
      { label: 'Financial offers', href: '/admin/ops/financial-offers' },
      { label: 'Projects', href: '/admin/ops/projects', adminOnly: true },
      { label: 'Company', href: '/admin/ops/company' },
    ],
  },
}

export const ADMIN_PRODUCT_AREA_LIST = Object.values(ADMIN_PRODUCT_AREAS)

/** Ops is internal BTF tooling — not for client portal users. */
export function canAccessOps(role: string | null | undefined): boolean {
  return isBtfStaffRole(role)
}

export function getVisibleProductAreas(role: string | null | undefined): AdminProductAreaConfig[] {
  if (!canAccessOps(role)) return [ADMIN_PRODUCT_AREAS.support]
  return ADMIN_PRODUCT_AREA_LIST
}

export function getAdminProductArea(pathname: string): AdminProductArea {
  if (pathname === '/admin/ops' || pathname.startsWith('/admin/ops/')) return 'ops'
  return 'support'
}

export function getAdminProductAreaConfig(pathname: string): AdminProductAreaConfig {
  return ADMIN_PRODUCT_AREAS[getAdminProductArea(pathname)]
}
