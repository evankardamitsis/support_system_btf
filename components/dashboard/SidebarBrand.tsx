'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ProductAreaSwitcher } from '@/components/admin/ProductAreaSwitcher'
import { getAdminProductAreaConfig } from '@/lib/admin/product-areas'

export function SidebarBrand({
  variant,
  userRole,
  onNavigate,
}: {
  variant: 'admin' | 'portal'
  userRole?: string
  onNavigate?: () => void
}) {
  const pathname = usePathname()
  const href =
    variant === 'admin'
      ? getAdminProductAreaConfig(pathname).homeHref
      : '/portal/tickets'

  return (
    <div className="dash-sidebar-brand">
      <div className="dash-sidebar-brand-row">
        <Link href={href} className="dash-sidebar-brand-link" onClick={onNavigate}>
          <Image
            src="/btf-wordmark.svg"
            alt="BTF"
            width={96}
            height={14}
            className="dash-sidebar-logo"
            priority
          />
        </Link>
        {variant === 'admin' ? (
          <ProductAreaSwitcher userRole={userRole} onNavigate={onNavigate} />
        ) : null}
      </div>
    </div>
  )
}
