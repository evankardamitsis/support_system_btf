'use client'

import { useState } from 'react'
import { ResolveCelebrationProvider } from '@/components/admin/ResolveCelebrationProvider'
import { AdminSidebar } from './Sidebar'
import { TopBar } from './TopBar'

interface DashboardShellProps {
  children: React.ReactNode
  userName?: string
  userEmail?: string
  userRole?: string
}

export function DashboardShell({ children, userName, userEmail, userRole }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <ResolveCelebrationProvider>
    <div data-theme="dashboard" className="flex flex-col h-screen overflow-hidden dash-shell">
      <TopBar
        userName={userName}
        userEmail={userEmail}
        userRole={userRole}
        menuOpen={sidebarOpen}
        onMenuClick={() => setSidebarOpen(open => !open)}
      />

      <div className="flex flex-1 overflow-hidden">
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-20 lg:hidden bg-black/60"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        <div
          className={`
          fixed inset-y-0 left-0 z-30 lg:static lg:z-auto
          transform transition-transform duration-200 ease-out lg:transform-none
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        >
          <AdminSidebar
            userName={userName}
            userEmail={userEmail}
            userRole={userRole}
            onClose={() => setSidebarOpen(false)}
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
