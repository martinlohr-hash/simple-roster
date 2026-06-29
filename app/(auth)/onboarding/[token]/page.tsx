import { prisma } from '@/lib/db'
import Link from 'next/link'
import OnboardingForm from '@/components/onboarding/OnboardingForm'

type Props = { params: Promise<{ token: string }> }

export default async function OnboardingPage({ params }: Props) {
  const { token } = await params
  const user = await prisma.user.findUnique({ where: { inviteToken: token } })

  if (!user || !user.inviteTokenExpiry || user.inviteTokenExpiry < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-amber-100 mb-4">
            <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Einladungslink ungültig</h1>
          <p className="text-sm text-gray-500 mb-6">
            Dieser Link ist abgelaufen oder wurde bereits verwendet. Wenn du dein Passwort
            schon festgelegt hast, melde dich einfach direkt an.
          </p>
          <div className="space-y-3">
            <Link
              href="/login"
              className="block w-full py-2.5 px-4 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition active:scale-[0.97]"
            >
              Zur Anmeldung
            </Link>
            <Link
              href="/passwort-vergessen"
              className="block text-sm text-indigo-600 hover:text-indigo-700 hover:underline"
            >
              Passwort vergessen?
            </Link>
          </div>
          <p className="text-xs text-gray-400 mt-6">
            Falls du noch kein Konto aktivieren konntest, bitte deinen Admin um eine neue Einladung.
          </p>
        </div>
      </div>
    )
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
        <OnboardingForm token={token} defaultName={user.name} email={user.email} />
      </div>
    </div>
  )
}
