import { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { getAdminSession } from '@/server/admin/session'
import AdminShell from '@/components/admin/AdminShell'

export default async function AdminProtectedLayout({ children }: { children: ReactNode }) {
  const session = await getAdminSession()
  if (!session) {
    // no session: go to login
    redirect('/admin/login')
  }
  return <AdminShell>{children}</AdminShell>
}
