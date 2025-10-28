import { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { getAdminSession } from '@/server/admin/session'

export default async function AdminProtectedLayout({ children }: { children: ReactNode }) {
  const session = await getAdminSession()
  if (!session) {
    // no session: go to login
    redirect('/admin/login')
  }
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="font-semibold mb-3">Admin Dashboard</div>
          <nav className="flex flex-wrap gap-4 text-sm border-t pt-3">
            <a href="/admin" className="text-gray-700 hover:underline">Overzicht</a>
            <a href="/admin/candidates" className="text-gray-700 hover:underline">Deelnemers</a>
            <a href="/admin/results" className="text-gray-700 hover:underline">Resultaten</a>
            <a href="/admin/activity" className="text-gray-700 hover:underline">Live Activiteit</a>
            <a href="/admin/events" className="text-gray-700 hover:underline">Audit Log</a>
            <a href="/admin/export" className="text-gray-700 hover:underline">Export</a>
            <a href="/admin/allowlist" className="text-gray-700 hover:underline">Allowlist</a>
            <a href="/admin/notifications" className="text-gray-700 hover:underline">Meldingen</a>
            <a href="/admin/settings" className="text-gray-700 hover:underline">Instellingen</a>
            <form action="/api/admin/logout" method="post" style={{ display: 'inline', marginLeft: 'auto' }}>
              <button className="text-red-600 hover:underline" type="submit">Uitloggen</button>
            </form>
          </nav>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}
