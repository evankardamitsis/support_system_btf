'use client'

import { useEffect } from 'react'
import { initNotificationAudio } from '@/lib/ui/play-notification-chime'

export function NotificationAudioInit() {
  useEffect(() => {
    initNotificationAudio()
  }, [])

  return null
}
