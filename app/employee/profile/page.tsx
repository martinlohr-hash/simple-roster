import { redirect } from 'next/navigation'
import { getSession } from '@/app/actions/auth'
import { prisma } from '@/lib/db'
import ProfileForm from '@/components/employee/ProfileForm'

export default async function ProfilePage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { name: true, email: true, phone: true, address: true },
  })
  if (!user) redirect('/login')

  return <ProfileForm user={user} />
}
