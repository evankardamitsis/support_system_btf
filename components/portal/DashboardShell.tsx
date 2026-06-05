'use client'

import { useCallback, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { PortalOnboarding } from './PortalOnboarding'
import { PortalSidebar } from './Sidebar'
import { PortalTopBar } from './TopBar'

interface PortalShellProps {
  children: React.ReactNode
  userName?: string
  userEmail?: string
  onboardingCompleted: boolean
  hoursBilling?: boolean
}

export function PortalDashboardShell({
  children,
  userName,
  userEmail,
  onboardingCompleted,
  hoursBilling = true,
}: PortalShellProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [tourRunId, setTourRunId] = useState(0)

  const startTour = useCallback(() => {
    setSidebarOpen(false)
    const bumpTour = () => setTourRunId(id => id + 1)

    if (pathname !== '/portal/tickets') {
      router.push('/portal/tickets')
      window.setTimeout(bumpTour, 400)
      return
    }
    bumpTour()
  }, [pathname, router])

  return (
    <div data-theme="dashboard" className="flex flex-col h-screen overflow-hidden dash-shell">
      <PortalTopBar
        userName={userName}
        userEmail={userEmail}
        onMenuClick={() => setSidebarOpen(true)}
      />

      <div className="flex flex-1 overflow-hidden">
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-20 lg:hidden bg-black/60"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        <div
          className={`fixed inset-y-0 left-0 z-30 lg:static lg:z-auto transform transition-transform duration-200 ease-out lg:transform-none ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        >
          <PortalSidebar
            userName={userName}
            userEmail={userEmail}
            onClose={() => setSidebarOpen(false)}
            onShowTour={startTour}
          />
        </div>
        <main className="flex-1 overflow-y-auto dash-main">
          <div className="dash-main-inner">
            {children}
          </div>
        </main>
      </div>

      <PortalOnboarding
        onboardingCompleted={onboardingCompleted}
        runId={tourRunId}
        hoursBilling={hoursBilling}
      />
    </div>
  )
}
