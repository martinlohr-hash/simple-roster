import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import OnboardingForm from '@/components/onboarding/OnboardingForm'

type Props = { params: Promise<{ token: string }> }

export default async function OnboardingPage({ params }: Props) {
  const { token } = await params
  const user = await prisma.user.findUnique({ where: { inviteToken: token } })

  if (!user || !user.inviteTokenExpiry || user.inviteTokenExpiry < new Date()) {
    notFound()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-900 mb-1">Willkommen, {user.name}</h1>
          <p className="text-sm text-gray-500">
            Lege dein Passwort fest, um dein Konto zu aktivieren.
          </p>
        </div>
        <OnboardingForm token={token} defaultName={user.name} />
      </div>
    </div>
  )
}
