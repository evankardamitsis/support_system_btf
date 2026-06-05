'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  canAccessOps,
  getVisibleProductAreas,
  getAdminProductArea,
} from '@/lib/admin/product-areas'

export function ProductAreaSwitcher({
  userRole,
  onNavigate,
}: {
  userRole?: string
  onNavigate?: () => void
}) {
  const pathname = usePathname()
  const current = getAdminProductArea(pathname)
  const areas = getVisibleProductAreas(userRole)
  const showOps = canAccessOps(userRole)

  if (!showOps) {
    return (
      <span className="dash-product-only dash-product-only--support" aria-current="page">
        <span className="dash-product-slash" aria-hidden>
          /
        </span>
        support
      </span>
    )
  }

  return (
    <div className="dash-product-switcher" role="group" aria-label="Product area">
      <span className="dash-product-slash" aria-hidden>
        /
      </span>
      {areas.map(area => {
        const active = area.id === current
        return (
          <Link
            key={area.id}
            href={area.homeHref}
            role="tab"
            aria-selected={active}
            aria-current={active ? 'page' : undefined}
            className={`dash-product-option dash-product-option--${area.id}${active ? ' is-active' : ''}`}
            onClick={onNavigate}
          >
            {area.label}
          </Link>
        )
      })}
    </div>
  )
}
