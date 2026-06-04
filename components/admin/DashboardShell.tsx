'use client'

import { useState } from 'react'
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
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: '#f5f4f2' }}>
      {/* Unified dark top bar — full width, same color as sidebar */}
      <TopBar
        userName={userName}
        userEmail={userEmail}
        onMenuClick={() => setSidebarOpen(true)}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Mobile backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-20 lg:hidden"
            style={{ background: 'rgba(0,0,0,0.5)' }}
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div className={`
          fixed inset-y-0 left-0 z-30 lg:static lg:z-auto
          transform transition-transform duration-200 ease-out lg:transform-none
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <AdminSidebar
            userName={userName}
            userEmail={userEmail}
            userRole={userRole}
            onClose={() => setSidebarOpen(false)}
          />
        </div>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <div className="px-8 py-7 max-w-[1300px]">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
