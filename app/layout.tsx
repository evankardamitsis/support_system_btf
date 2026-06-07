import type { Metadata } from 'next'
import { DM_Mono, Geist } from 'next/font/google'
import { AppToaster } from '@/components/ui/AppToaster'
import './globals.css'

const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-dm-mono',
  display: 'swap',
})

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'BTF Support',
    template: '%s · BTF Support',
  },
  description:
    'Submit requests to Below The Fold, follow ticket progress, and stay aligned with your BTF team — one client portal and support hub.',
  openGraph: {
    title: 'BTF Support',
    description:
      'Submit requests to Below The Fold, follow ticket progress, and stay aligned with your BTF team — one client portal and support hub.',
    siteName: 'BTF Support',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={`${dmMono.variable} ${geist.variable}`}>
      <body suppressHydrationWarning>
        {children}
        <AppToaster />
      </body>
    </html>
  )
}
