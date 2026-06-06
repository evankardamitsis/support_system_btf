'use client'

import { useCallback, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useSidebarOpen } from '@/lib/ui/use-sidebar-open'
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
  const { sidebarOpen, toggleSidebar, closeSidebar } = useSidebarOpen()
  const [tourRunId, setTourRunId] = useState(0)

  const startTour = useCallback(() => {
    closeSidebar()
    const bumpTour = () => setTourRunId(id => id + 1)

    if (pathname !== '/portal/tickets') {
      router.push('/portal/tickets')
      window.setTimeout(bumpTour, 400)
      return
    }
    bumpTour()
  }, [closeSidebar, pathname, router])

  return (
    <div data-theme="dashboard" className="dash-shell flex flex-col h-dvh min-h-0 overflow-hidden">
      <PortalTopBar
        userName={userName}
        userEmail={userEmail}
        menuOpen={sidebarOpen}
        onMenuClick={toggleSidebar}
      />

      <div className="dash-body flex flex-1 min-h-0 min-w-0 overflow-hidden">
        {sidebarOpen ? (
          <div
            className="dash-sidebar-backdrop fixed inset-0 z-20 bg-black/60"
            onClick={closeSidebar}
            aria-hidden
          />
        ) : null}
        <div className={`dash-sidebar-wrap${sidebarOpen ? ' is-open' : ' is-collapsed'}`}>
          <PortalSidebar
            userName={userName}
            userEmail={userEmail}
            onClose={closeSidebar}
            onShowTour={startTour}
          />
        </div>
        <main className="dash-main flex-1 min-h-0 min-w-0 overflow-y-auto">
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
