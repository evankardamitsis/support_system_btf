import { AppFooter } from '@/components/layout/AppFooter'
import { AuthShellChrome } from '@/components/layout/AuthShellChrome'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-theme="auth" className="auth-shell relative min-h-dvh flex flex-col" style={{ background: 'var(--bg)' }}>
      <AuthShellChrome />
      <div className="auth-shell-body flex-1 flex flex-col min-h-0 w-full">{children}</div>
      <AppFooter />
    </div>
  )
}
