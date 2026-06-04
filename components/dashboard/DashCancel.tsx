import Link from 'next/link'

export function DashCancel({ href, children = 'Cancel' }: { href: string; children?: string }) {
  return (
    <Link href={href} className="dash-btn-ghost inline-flex items-center px-5 py-2.5">
      {children}
    </Link>
  )
}
