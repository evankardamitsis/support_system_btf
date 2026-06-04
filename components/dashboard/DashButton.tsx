import Link from 'next/link'
import type { ReactNode } from 'react'

export function DashButton({
  href,
  children,
  className = '',
}: {
  href: string
  children: ReactNode
  className?: string
}) {
  return (
    <Link href={href} className={`dash-btn-primary btn-primary ${className}`}>
      {children}
    </Link>
  )
}
