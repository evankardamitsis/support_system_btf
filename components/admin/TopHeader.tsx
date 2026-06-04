'use client'

import { usePathname, useRouter } from 'next/navigation'
import { Menu, ChevronDown, LogOut, Settings } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const sections: Record<string, string[]> = {
  '/admin/tickets':   ['BTF Support', 'Tickets'],
  '/admin/clients':   ['BTF Support', 'Clients'],
  '/admin/retainers': ['BTF Support', 'Retainers'],
}

function initials(name?: string, email?: string) {
  if (name) {
    const p = name.trim().split(' ')
    return ((p[0]?.[0] ?? '') + (p[1]?.[0] ?? '')).toUpperCase()
  }
  return email?.[0]?.toUpperCase() ?? '?'
}

interface TopHeaderProps {
  userName?: string
  userEmail?: string
  onMenuClick: () => void
}

export function TopHeader({ userName, userEmail, onMenuClick }: TopHeaderProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const crumbs = Object.entries(sections).find(([k]) => pathname.startsWith(k))?.[1] ?? ['BTF Support']
  const ini = initials(userName, userEmail)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <header
      className="sticky top-0 z-10 flex items-center justify-between h-11 px-4 shrink-0"
      style={{ background: '#f7f6f3', borderBottom: '1px solid #e9e9e7' }}
    >
      {/* Left: breadcrumb */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors mr-1"
        >
          <Menu size={16} />
        </button>
        {crumbs.map((crumb, i) => (
          <span key={crumb} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-gray-300 text-xs">/</span>}
            <span
              className={`text-sm ${i === crumbs.length - 1 ? 'text-gray-700 font-medium' : 'text-gray-400'}`}
            >
              {crumb}
            </span>
          </span>
        ))}
      </div>

      {/* Right: user */}
      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-gray-200 transition-colors"
        >
          <div className="w-5 h-5 rounded-full bg-gray-800 flex items-center justify-center text-[9px] font-semibold text-white shrink-0">
            {ini}
          </div>
          <span className="hidden sm:block text-sm text-gray-600 font-medium">
            {userName?.split(' ')[0] ?? userEmail}
          </span>
          <ChevronDown size={12} className="text-gray-400" />
        </button>

        {open && (
          <div
            className="absolute right-0 mt-1 w-56 rounded-lg py-1 z-50 anim-fade"
            style={{ background: '#fff', border: '1px solid #e9e9e7', boxShadow: '0 8px 24px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.06)' }}
          >
            <div className="px-3 py-2.5" style={{ borderBottom: '1px solid #f0f0ee' }}>
              <p className="text-sm font-medium text-gray-900">{userName}</p>
              <p className="text-xs text-gray-400 truncate mt-0.5">{userEmail}</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors mt-0.5"
            >
              <LogOut size={13} />
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
