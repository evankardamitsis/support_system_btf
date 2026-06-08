'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ColorModeToggle } from '@/components/ui/ColorModeToggle'

export function LandingHeader() {
  return (
    <header
      className="flex items-center justify-between px-8 md:px-16 py-5 shrink-0"
      style={{ borderBottom: '1px solid var(--border)' }}
    >
      <Image
        src="/btf-wordmark.svg"
        alt="Below The Fold"
        width={120}
        height={16}
        priority
        className="theme-wordmark"
        style={{ height: 14, width: 'auto' }}
      />
      <div className="public-header-actions">
        <ColorModeToggle compact />
        <Link
          href="/auth/login"
          className="text-[11px] tracking-[0.15em] uppercase px-4 py-2 cursor-pointer transition-opacity duration-150 hover:opacity-70"
          style={{
            fontFamily: 'var(--font-dm-mono)',
            color: 'var(--text-2)',
            border: '1px solid var(--border)',
          }}
        >
          Sign in
        </Link>
      </div>
    </header>
  )
}
