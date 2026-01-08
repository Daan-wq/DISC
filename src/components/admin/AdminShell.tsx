'use client'

import { cn } from '@/lib/utils'
import {
  Activity,
  Bell,
  ChevronLeft,
  ChevronRight,
  FileText,
  LayoutDashboard,
  ListChecks,
  LogOut,
  MessageSquare,
  Menu,
  Settings,
  Shield,
  Users,
  X,
} from 'lucide-react'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { type ComponentType, type ReactNode, useCallback, useEffect, useState } from 'react'

interface NavItem {
  href: string
  label: string
  Icon: ComponentType<{ className?: string }>
}

interface NavGroup {
  title: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Overzicht',
    items: [
      { href: '/', label: 'Dashboard', Icon: LayoutDashboard },
    ],
  },
  {
    title: 'Beheer',
    items: [
      { href: '/candidates', label: 'Deelnemers', Icon: Users },
      { href: '/results', label: 'Resultaten', Icon: FileText },
      { href: '/allowlist', label: 'Toegangslijst', Icon: Shield },
    ],
  },
  {
    title: 'Monitoring',
    items: [
      { href: '/activity', label: 'Live Activiteit', Icon: Activity },
      { href: '/events', label: 'Logboek', Icon: ListChecks },
      { href: '/notifications', label: 'Meldingen', Icon: Bell },
      { href: '/feedback', label: 'Feedback', Icon: MessageSquare },
    ],
  },
]

const BOTTOM_NAV: NavItem[] = [
  { href: '/settings', label: 'Instellingen', Icon: Settings },
]

const LogoutButton = ({ collapsed }: { collapsed: boolean }) => {
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    if (isLoggingOut) return
    setIsLoggingOut(true)
    try {
      await fetch('/api/admin/logout', {
        method: 'POST',
        credentials: 'include',
      })
      window.location.href = '/login'
    } catch (error) {
      console.error('Logout failed:', error)
      setIsLoggingOut(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isLoggingOut}
      className={cn(
        'group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
        'text-slate-600 hover:bg-red-50 hover:text-red-700',
        'disabled:opacity-50 disabled:cursor-not-allowed'
      )}
      title={collapsed ? 'Uitloggen' : undefined}
    >
      <LogOut className="h-5 w-5 shrink-0 text-slate-400 group-hover:text-red-600" />
      {!collapsed && <span>{isLoggingOut ? 'Uitloggen...' : 'Uitloggen'}</span>}
    </button>
  )
}

const SidebarItem = ({
  item,
  collapsed,
  pathname,
}: {
  item: NavItem
  collapsed: boolean
  pathname: string
}) => {
  const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))

  return (
    <Link
      href={item.href}
      className={cn(
        'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
        active
          ? 'bg-blue-50 text-blue-700'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      )}
      title={collapsed ? item.label : undefined}
    >
      <item.Icon
        className={cn(
          'h-5 w-5 shrink-0',
          active ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
        )}
      />
      {!collapsed && <span>{item.label}</span>}
    </Link>
  )
}

const SidebarContent = ({
  collapsed,
  pathname,
  onCollapse,
}: {
  collapsed: boolean
  pathname: string
  onCollapse?: () => void
}) => (
  <div className="flex h-full flex-col">
    <div className="flex h-16 items-center border-b border-slate-200 px-4">
      {!collapsed && (
        <Link href="/" className="font-semibold text-slate-900">
          Admin
        </Link>
      )}
      {collapsed && (
        <Link href="/" className="mx-auto font-semibold text-slate-900 text-sm" aria-label="Admin">
          A
        </Link>
      )}
    </div>

    <nav className="flex-1 overflow-y-auto px-3 py-4">
      <div className="space-y-6">
        {NAV_GROUPS.map((group) => (
          <div key={group.title}>
            {!collapsed && (
              <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                {group.title}
              </h3>
            )}
            <div className="space-y-1">
              {group.items.map((item) => (
                <SidebarItem
                  key={item.href}
                  item={item}
                  collapsed={collapsed}
                  pathname={pathname}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </nav>

    <div className="border-t border-slate-200 px-3 py-4">
      <div className="space-y-1">
        {BOTTOM_NAV.map((item) => (
          <SidebarItem
            key={item.href}
            item={item}
            collapsed={collapsed}
            pathname={pathname}
          />
        ))}

        {onCollapse && (
          <button
            type="button"
            onClick={onCollapse}
            className={cn(
              'group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            )}
            title={collapsed ? 'Sidebar uitklappen' : 'Sidebar inklappen'}
            aria-label={collapsed ? 'Sidebar uitklappen' : 'Sidebar inklappen'}
          >
            {collapsed ? (
              <ChevronRight className="h-5 w-5 shrink-0 text-slate-400 group-hover:text-slate-600" />
            ) : (
              <>
                <ChevronLeft className="h-5 w-5 shrink-0 text-slate-400 group-hover:text-slate-600" />
                <span>Inklappen</span>
              </>
            )}
          </button>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-slate-200">
        <LogoutButton collapsed={collapsed} />
      </div>
    </div>
  </div>
)

export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [notificationsUnauthorized, setNotificationsUnauthorized] = useState(false)

  const fetchUnreadCount = useCallback(async () => {
    try {
      if (notificationsUnauthorized) return
      const res = await fetch('/api/admin/notifications/unread-count', { credentials: 'include' })
      if (res.status === 401) {
        setUnreadCount(0)
        setNotificationsUnauthorized(true)
        // Don't redirect - just stop polling. User can continue using dashboard.
        return
      }
      if (res.ok) {
        const data = await res.json()
        setUnreadCount(data.count || 0)
      }
    } catch {}
  }, [notificationsUnauthorized])

  const markNotificationsRead = useCallback(async () => {
    try {
      if (notificationsUnauthorized) {
        setUnreadCount(0)
        return
      }
      await fetch('/api/admin/notifications/mark-read', { method: 'POST', credentials: 'include' })
      setUnreadCount(0)
    } catch {}
  }, [notificationsUnauthorized])

  useEffect(() => {
    setMobileOpen(false)
    // Mark notifications as read when visiting the notifications page
    if (pathname === '/notifications') {
      markNotificationsRead()
    }
  }, [pathname, markNotificationsRead])

  useEffect(() => {
    // Fetch unread count only on mount (page refresh).
    // No polling or focus events to reduce noise in logs.
    fetchUnreadCount()
  }, [fetchUnreadCount])

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setMobileOpen(false)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div className="flex h-screen bg-slate-50">
      <aside
        className={cn(
          'hidden lg:flex flex-col border-r border-slate-200 bg-white transition-all duration-300',
          collapsed ? 'w-[72px]' : 'w-64'
        )}
      >
        <SidebarContent
          collapsed={collapsed}
          pathname={pathname}
          onCollapse={() => setCollapsed(!collapsed)}
        />
      </aside>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 transform bg-white shadow-xl transition-transform duration-300 lg:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute right-3 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label="Menu sluiten"
        >
          <X className="h-5 w-5" />
        </button>
        <SidebarContent collapsed={false} pathname={pathname} />
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 lg:px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 lg:hidden"
              aria-label="Menu openen"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="hidden sm:flex items-center gap-2 text-sm text-slate-500">
              <Link href="/" className="hover:text-slate-700">
                Dashboard
              </Link>
              {pathname !== '/' && (
                <>
                  <span>/</span>
                  <span className="text-slate-900 font-medium">
                    {NAV_GROUPS.flatMap((g) => g.items)
                      .concat(BOTTOM_NAV)
                      .find((i) => i.href === pathname)?.label || 'Pagina'}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/notifications"
              className="relative flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
              title="Meldingen"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>

          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  )
}