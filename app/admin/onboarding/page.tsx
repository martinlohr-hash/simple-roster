import { prisma } from '@/lib/db'
import { isMailConfigured } from '@/lib/mail'
import OnboardingManager from '@/components/admin/OnboardingManager'

export const metadata = { title: 'Onboarding-Mails – SimpleRoster' }

export default async function OnboardingPage() {
  const [steps, inProgress, deliveries] = await Promise.all([
    prisma.onboardingStep.findMany({
      orderBy: [{ delayDays: 'asc' }, { order: 'asc' }, { createdAt: 'asc' }],
    }),
    prisma.user.count({ where: { role: 'EMPLOYEE', onboardingDripStartedAt: { not: null } } }),
    prisma.onboardingDelivery.count({ where: { status: 'SENT' } }),
  ])

  const plainSteps = steps.map((s) => ({
    id: s.id,
    order: s.order,
    delayDays: s.delayDays,
    subject: s.subject,
    body: s.body,
    ctaLabel: s.ctaLabel,
    ctaUrl: s.ctaUrl,
    active: s.active,
  }))

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
      <header className="mb-5">
        <h1 className="text-xl font-semibold tracking-tight text-gray-900">Onboarding-Mails</h1>
        <p className="text-sm text-gray-500 mt-1 leading-relaxed">
          Automatische Mail-Serie für neue Mitarbeiter. Die Sequenz startet beim ersten Login
          (Passwort-Setzen): Tag-0-Mail geht sofort raus, die weiteren je nach <em>Verzögerung</em>{' '}
          jeweils einmal pro Tag.
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 font-medium">
            {inProgress} MA in der Sequenz
          </span>
          <span className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 font-medium">
            {deliveries} Mails versendet
          </span>
          {!isMailConfigured() && (
            <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 font-medium">
              ⚠ Mailversand nicht konfiguriert
            </span>
          )}
        </div>
      </header>

      <OnboardingManager initialSteps={plainSteps} />
    </div>
  )
}
