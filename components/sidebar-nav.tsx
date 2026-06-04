'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface NavItem {
  label: string
  href: string
}

interface SidebarNavProps {
  items: NavItem[]
  userEmail?: string
  userRole?: string
  userName?: string
}

export function SidebarNav({ items, userEmail, userRole, userName }: SidebarNavProps) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <aside className="w-[220px] shrink-0 bg-zinc-950 border-r border-zinc-800/60 flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-zinc-800/60">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono tracking-[0.2em] text-zinc-300 uppercase font-medium">BTF</span>
          <span className="w-px h-3 bg-zinc-700" />
          <span className="text-xs tracking-wide text-zinc-600">Support</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center px-3 py-2 text-sm transition-colors rounded-none ${
                active
                  ? 'text-zinc-100 bg-zinc-800/70'
                  : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/40'
              }`}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User + logout */}
      <div className="px-5 py-4 border-t border-zinc-800/60 space-y-3">
        <div className="space-y-0.5">
          {userName && (
            <p className="text-xs font-medium text-zinc-300 truncate">{userName}</p>
          )}
          {userEmail && (
            <p className="text-xs text-zinc-600 truncate">{userEmail}</p>
          )}
          {userRole && (
            <span className="inline-block text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 bg-zinc-800 text-zinc-500 mt-1">
              {userRole}
            </span>
          )}
        </div>
        <button
          onClick={handleLogout}
          className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors cursor-pointer"
        >
          Sign out
        </button>
      </div>
    </aside>
  )
}
