import { redirect } from 'next/navigation'
import { getAdminSession } from '@/server/admin/session'
import AdminShell from '@/components/admin/AdminShell'

// Force dynamic rendering - prevents caching of auth state
export const dynamic = 'force-dynamic'

export default async function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession()
  if (!session) {
    // no session: go to login
    redirect('/login')
  }
  return <AdminShell>{children}</AdminShell>
}
