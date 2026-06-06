'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import {
  ADMIN_PRODUCT_AREAS,
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
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handlePointer = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', handlePointer)
    return () => document.removeEventListener('pointerdown', handlePointer)
  }, [])

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

  const currentConfig = ADMIN_PRODUCT_AREAS[current]

  function handleNavigate() {
    setOpen(false)
    onNavigate?.()
  }

  return (
    <div className="dash-product-dropdown" ref={ref}>
      <button
        type="button"
        className={`dash-product-dropdown-trigger dash-product-dropdown-trigger--${current}${open ? ' is-open' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Product area: ${currentConfig.label}`}
        onClick={() => setOpen(value => !value)}
      >
        <span className="dash-product-slash" aria-hidden>
          /
        </span>
        <span className="dash-product-dropdown-label">{currentConfig.label}</span>
        <ChevronDown size={14} className="dash-product-dropdown-chevron" aria-hidden />
      </button>
      {open ? (
        <ul className="dash-product-dropdown-menu anim-fade" role="listbox" aria-label="Product area">
          {areas.map(area => {
            const active = area.id === current
            return (
              <li key={area.id} role="presentation">
                <Link
                  href={area.homeHref}
                  role="option"
                  aria-selected={active}
                  className={`dash-product-dropdown-option dash-product-dropdown-option--${area.id}${active ? ' is-active' : ''}`}
                  onClick={handleNavigate}
                >
                  {area.label}
                </Link>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
