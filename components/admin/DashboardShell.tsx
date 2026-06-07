'use client'

import dynamic from 'next/dynamic'
import { ResolveCelebrationProvider } from '@/components/admin/ResolveCelebrationProvider'
import { NotificationAudioInit } from '@/components/dashboard/NotificationAudioInit'

const OpsCommsLauncher = dynamic(
  () => import('@/components/comms/OpsCommsLauncher').then(module => module.OpsCommsLauncher),
  { ssr: false }
)
import { useSidebarOpen } from '@/lib/ui/use-sidebar-open'
import { AppFooter } from '@/components/layout/AppFooter'
import { AdminSidebar } from './Sidebar'
import { TopBar } from './TopBar'

interface DashboardShellProps {
  children: React.ReactNode
  userName?: string
  userEmail?: string
  userRole?: string
}

export function DashboardShell({ children, userName, userEmail, userRole }: DashboardShellProps) {
  const { sidebarOpen, toggleSidebar, closeSidebar } = useSidebarOpen()

  return (
    <ResolveCelebrationProvider>
    <NotificationAudioInit />
    <div data-theme="dashboard" className="dash-shell flex flex-col h-dvh min-h-0 overflow-hidden">
      <TopBar
        userName={userName}
        userEmail={userEmail}
        userRole={userRole}
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
        <div
          className={`dash-sidebar-wrap${sidebarOpen ? ' is-open' : ' is-collapsed'}`}
        >
          <AdminSidebar
            userName={userName}
            userEmail={userEmail}
            userRole={userRole}
            onClose={closeSidebar}
          />
        </div>

        <main className="dash-main flex-1 min-h-0 min-w-0 overflow-y-auto">
          <div className="dash-main-inner">
            {children}
          </div>
        </main>
      </div>

      <AppFooter />
      <OpsCommsLauncher />
    </div>
    </ResolveCelebrationProvider>
  )
}
