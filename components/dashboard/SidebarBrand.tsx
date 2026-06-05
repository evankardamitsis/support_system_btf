import Image from 'next/image'
import Link from 'next/link'

export function SidebarBrand({
  variant,
  onNavigate,
}: {
  variant: 'admin' | 'portal'
  onNavigate?: () => void
}) {
  const href = variant === 'admin' ? '/admin/tickets' : '/portal/tickets'

  return (
    <div className="dash-sidebar-brand">
      <Link href={href} className="dash-sidebar-brand-link" onClick={onNavigate}>
        <Image
          src="/btf-wordmark.svg"
          alt="BTF"
          width={96}
          height={14}
          className="dash-sidebar-logo"
          priority
        />
        {variant === 'admin' ? <span className="dash-sidebar-tag">/ support</span> : null}
      </Link>
    </div>
  )
}
