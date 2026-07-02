import { redirect } from 'next/navigation'
import { getSession } from '@/app/actions/auth'
import { prisma } from '@/lib/db'
import { getBaseUrl } from '@/lib/baseUrl'
import ProfileForm from '@/components/employee/ProfileForm'
import CalendarFeedCard from '@/components/employee/CalendarFeedCard'

export default async function ProfilePage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      name: true,
      email: true,
      phone: true,
      address: true,
      unavailableDays: true,
      preferredDays: true,
      earliestStart: true,
      latestEnd: true,
      icalToken: true,
    },
  })
  if (!user) redirect('/login')

  const feedUrl = user.icalToken ? `${getBaseUrl()}/api/ical/${user.icalToken}` : null

  return (
    <div>
      <ProfileForm user={user} />
      <CalendarFeedCard feedUrl={feedUrl} />
    </div>
  )
}
