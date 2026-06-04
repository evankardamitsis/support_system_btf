'use client'

import { DashboardTopBar } from '@/components/dashboard/DashboardTopBar'

type PortalTopBarProps = {
  userName?: string
  userEmail?: string
  onMenuClick: () => void
}

export function PortalTopBar(props: PortalTopBarProps) {
  return <DashboardTopBar variant="portal" {...props} />
}
