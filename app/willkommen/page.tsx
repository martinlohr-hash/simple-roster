import { redirect } from 'next/navigation'
import { getSession } from '@/app/actions/auth'
import { isAdmin } from '@/lib/session'
import { prisma } from '@/lib/db'
import OnboardingProfileForm from '@/components/employee/OnboardingProfileForm'

export const metadata = { title: 'Willkommen – Daten ergänzen' }

export default async function WelcomePage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (isAdmin(session.role)) redirect('/admin/schedule')

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      name: true,
      firstName: true,
      lastName: true,
      street: true,
      postalCode: true,
      city: true,
      nationality: true,
      birthday: true,
      birthName: true,
      birthPlace: true,
      gender: true,
      taxId: true,
      socialSecurityNo: true,
      iban: true,
      healthInsurance: true,
      phone: true,
      onboardingCompletedAt: true,
    },
  })
  if (!user) redirect('/login')
  if (user.onboardingCompletedAt) redirect('/employee/dashboard')

  // Falls Name noch nicht aufgeteilt ist: aus dem vollen Namen vorbefüllen.
  const [fallbackFirst, ...fallbackRest] = (user.name || '').split(' ')
  const initial = {
    firstName: user.firstName ?? fallbackFirst ?? '',
    lastName: user.lastName ?? fallbackRest.join(' ') ?? '',
    street: user.street ?? '',
    postalCode: user.postalCode ?? '',
    city: user.city ?? '',
    nationality: user.nationality ?? '',
    birthday: user.birthday ? user.birthday.toISOString().split('T')[0] : '',
    birthName: user.birthName ?? '',
    birthPlace: user.birthPlace ?? '',
    gender: user.gender ?? '',
    taxId: user.taxId ?? '',
    socialSecurityNo: user.socialSecurityNo ?? '',
    iban: user.iban ?? '',
    healthInsurance: user.healthInsurance ?? '',
    phone: user.phone ?? '',
  }

  return (
    <div className="min-h-dvh bg-gray-50 px-4 py-8">
      <div className="w-full max-w-xl mx-auto">
        <div className="mb-6 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-600 mb-4">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">Willkommen{initial.firstName ? `, ${initial.firstName}` : ''}!</h1>
          <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
            Bitte ergänze einmalig deine persönlichen Daten für die Lohnabrechnung.
            Die Angaben zur Beschäftigung trägt dein Arbeitgeber ein.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
          <OnboardingProfileForm initial={initial} />
        </div>
      </div>
    </div>
  )
}
