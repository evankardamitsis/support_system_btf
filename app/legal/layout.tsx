import Link from 'next/link'
import Image from 'next/image'
import { AppFooter } from '@/components/layout/AppFooter'

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-theme="landing"
      className="legal-shell min-h-dvh flex flex-col"
      style={{ background: 'var(--bg)', color: 'var(--text-1)' }}
    >
      <header className="legal-shell-header shrink-0">
        <Link href="/" className="legal-shell-brand" aria-label="BTF Support home">
          <Image
            src="/btf-wordmark.svg"
            alt="Below The Fold"
            width={96}
            height={14}
            style={{ height: 12, width: 'auto', opacity: 0.85 }}
          />
        </Link>
      </header>
      <main className="legal-shell-main flex-1 min-h-0">{children}</main>
      <AppFooter />
    </div>
  )
}
