'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  FileText,
  Settings,
  MessageSquare,
  History,
  LogOut,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Role } from '@/lib/types'

const memberNav = [
  { href: '/member', label: '報告ホーム', icon: ClipboardList },
  { href: '/member/history', label: '報告履歴', icon: History },
  { href: '/chat', label: 'ナレッジ検索', icon: MessageSquare },
]

const adminNav = [
  { href: '/admin', label: 'ダッシュボード', icon: LayoutDashboard },
  { href: '/admin/members', label: 'メンバー管理', icon: Users },
  { href: '/admin/attendance', label: '出勤簿', icon: FileText },
  { href: '/admin/settings', label: '設定', icon: Settings },
  { href: '/chat', label: 'ナレッジ検索', icon: MessageSquare },
]

const leaderNav = [
  { href: '/leader', label: 'ダッシュボード', icon: LayoutDashboard },
  { href: '/leader/attendance', label: '出勤簿', icon: FileText },
  { href: '/chat', label: 'ナレッジ検索', icon: MessageSquare },
]

interface SidebarProps {
  role: Role
  name: string
}

export default function Sidebar({ role, name }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const navItems = role === 'member' ? memberNav : role === 'leader' ? leaderNav : adminNav

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="flex flex-col h-full w-64 bg-slate-900 text-white">
      <div className="p-6 border-b border-slate-700">
        <h1 className="text-xl font-bold">BACKMAN</h1>
        <p className="text-sm text-slate-400 mt-1 truncate">{name}</p>
        <span className="text-xs bg-slate-700 px-2 py-0.5 rounded mt-1 inline-block">
          {role === 'admin' ? '管理者' : role === 'leader' ? 'リーダー' : 'メンバー'}
        </span>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(item => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                isActive
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-slate-700">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          ログアウト
        </button>
      </div>
    </div>
  )
}
