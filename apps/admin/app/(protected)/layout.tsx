import { redirect } from 'next/navigation'
import { getAdminSession } from '@/server/admin/session'
import AdminShell from '@/components/admin/AdminShell'

// Force dynamic rendering - prevents caching of auth state
export const dynamic = 'force-dynamic'

export default async function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession()
  console.log('[protected-layout] Session check result:', {
    hasSession: !!session,
    username: session?.u,
    exp: session?.exp,
    now: Date.now(),
    expired: session ? Date.now() > session.exp : null,
  })
  if (!session) {
    // no session: go to login
    console.log('[protected-layout] No session found, redirecting to /login')
    redirect('/login')
  }
  return <AdminShell>{children as any}</AdminShell>
}
