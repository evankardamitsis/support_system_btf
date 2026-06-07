'use client'

import { useEffect, useState } from 'react'

const COMMS_NARROW_MQ = '(max-width: 1023px)'

export function useCommsNarrowLayout() {
  const [narrow, setNarrow] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia(COMMS_NARROW_MQ)
    const update = () => setNarrow(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  return narrow
}
