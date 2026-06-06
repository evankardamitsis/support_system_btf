'use client'

import { DashboardTopBar } from '@/components/dashboard/DashboardTopBar'

type PortalTopBarProps = {
  userName?: string
  userEmail?: string
  menuOpen?: boolean
  onMenuClick: () => void
}

export function PortalTopBar(props: PortalTopBarProps) {
  return <DashboardTopBar variant="portal" {...props} />
}
