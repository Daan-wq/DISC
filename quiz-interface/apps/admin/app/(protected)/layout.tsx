import { redirect } from 'next/navigation'
import { getAdminSession } from '@/server/admin/session'
import AdminShell from '@/components/admin/AdminShell'

export default async function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession()
  if (!session) {
    // no session: go to login
    redirect('/login')
  }
  return <AdminShell>{children as React.ReactNode}</AdminShell>
}
