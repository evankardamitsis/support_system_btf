'use client'

import { useRouter } from 'next/navigation'
import { Menu, Search, ChevronDown, LogOut } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'

function initials(name?: string, email?: string) {
  if (name) { const p = name.trim().split(' '); return ((p[0]?.[0] ?? '') + (p[1]?.[0] ?? '')).toUpperCase() }
  return email?.[0]?.toUpperCase() ?? '?'
}

export function PortalTopBar({ userName, userEmail, onMenuClick }: {
  userName?: string; userEmail?: string; onMenuClick: () => void
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const ini = initials(userName, userEmail)

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <div className="flex items-center h-12 px-4 shrink-0 gap-3" style={{ background: '#1e1e26', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <button onClick={onMenuClick} className="lg:hidden p-1.5 rounded text-white/40 hover:text-white/70 hover:bg-white/8 transition-colors">
        <Menu size={17} />
      </button>
      <div className="hidden lg:flex items-center shrink-0" style={{ width: 224 }}>
        <Image src="/btf-wordmark.svg" alt="Below The Fold" width={70} height={10} style={{ height: 9, width: 'auto' }} priority />
      </div>
      <div className="flex-1 flex justify-center">
        <div className="flex items-center gap-2.5 w-full max-w-xs px-3 py-1.5 cursor-text" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}>
          <Search size={13} className="shrink-0" style={{ color: 'rgba(255,255,255,0.35)' }} />
          <span className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>Search…</span>
        </div>
      </div>
      <div className="relative shrink-0" ref={ref}>
        <button onClick={() => setOpen(!open)} className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-white/8 transition-colors">
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0" style={{ background: '#e8ff47', color: '#0f0f0f' }}>{ini}</div>
          <span className="hidden sm:block text-sm font-medium" style={{ color: 'rgba(255,255,255,0.7)' }}>{userName?.split(' ')[0] ?? userEmail}</span>
          <ChevronDown size={13} style={{ color: 'rgba(255,255,255,0.35)' }} />
        </button>
        {open && (
          <div className="absolute right-0 mt-1.5 w-52 rounded-xl py-1 z-50" style={{ background: '#2a2a36', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 12px 40px rgba(0,0,0,0.4)' }}>
            <div className="px-3 py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="text-sm font-medium text-white">{userName}</p>
              <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>{userEmail}</p>
            </div>
            <button onClick={handleLogout} className="flex items-center gap-2.5 w-full px-3 py-2 text-sm transition-colors mt-0.5" style={{ color: '#ff6b6b' }} onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,107,107,0.08)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <LogOut size={13} />Sign out
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
