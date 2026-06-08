'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ColorModeToggle } from '@/components/ui/ColorModeToggle'

export function LegalShellHeader() {
  return (
    <header className="legal-shell-header shrink-0">
      <Link href="/" className="legal-shell-brand" aria-label="BTF Support home">
        <Image
          src="/btf-wordmark.svg"
          alt="Below The Fold"
          width={96}
          height={14}
          className="theme-wordmark"
          style={{ height: 12, width: 'auto', opacity: 0.85 }}
        />
      </Link>
      <ColorModeToggle compact />
    </header>
  )
}
