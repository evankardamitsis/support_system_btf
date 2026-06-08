import { AppFooter } from '@/components/layout/AppFooter'
import { LegalShellHeader } from '@/components/layout/LegalShellHeader'

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-theme="landing"
      className="legal-shell min-h-dvh flex flex-col"
      style={{ background: 'var(--bg)', color: 'var(--text-1)' }}
    >
      <LegalShellHeader />
      <main className="legal-shell-main flex-1 min-h-0">{children}</main>
      <AppFooter />
    </div>
  )
}
