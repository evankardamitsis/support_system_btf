'use client'

import { DashboardTopBar } from '@/components/dashboard/DashboardTopBar'

type TopBarProps = {
  userName?: string
  userEmail?: string
  userRole?: string
  menuOpen?: boolean
  onMenuClick: () => void
}

export function TopBar(props: TopBarProps) {
  return <DashboardTopBar variant="admin" {...props} />
}
