import { redirect } from 'next/navigation'
import { getSession } from '@/app/actions/auth'

export default async function RootPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role === 'ADMIN') redirect('/admin/schedule')
  redirect('/employee/dashboard')
}
