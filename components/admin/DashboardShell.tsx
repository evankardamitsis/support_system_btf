'use client'

import { ResolveCelebrationProvider } from '@/components/admin/ResolveCelebrationProvider'
import { NotificationAudioInit } from '@/components/dashboard/NotificationAudioInit'
import { useSidebarOpen } from '@/lib/ui/use-sidebar-open'
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
    <div data-theme="dashboard" className="flex flex-col h-screen overflow-hidden dash-shell">
      <TopBar
        userName={userName}
        userEmail={userEmail}
        userRole={userRole}
        menuOpen={sidebarOpen}
        onMenuClick={toggleSidebar}
      />

      <div className="flex flex-1 overflow-hidden">
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

        <main className="flex-1 overflow-y-auto dash-main">
          <div className="dash-main-inner">
            {children}
          </div>
        </main>
      </div>
    </div>
    </ResolveCelebrationProvider>
  )
}
