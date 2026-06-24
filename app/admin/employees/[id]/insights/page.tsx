import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/db'
import { getSession } from '@/app/actions/auth'
import { isSuperAdmin } from '@/lib/session'
import InsightForm, { type InsightFormData } from '@/components/admin/insights/InsightForm'
import { personalityLabel, type PersonalityValue } from '@/lib/insights'

type Props = { params: Promise<{ id: string }> }

export default async function EmployeeInsightsPage({ params }: Props) {
  // Vertraulich: nur SUPER_ADMIN. Für alle anderen 404 (kein Hinweis auf Existenz).
  const session = await getSession()
  if (!session || !isSuperAdmin(session.role)) notFound()

  const { id } = await params
  const user = await prisma.user.findUnique({ where: { id }, include: { insight: true } })
  if (!user) notFound()

  const member: InsightFormData = {
    id: user.id,
    name: user.name,
    personalityType: (user.insight?.personalityType ?? 'UNKNOWN') as PersonalityValue,
    personalityNote: user.insight?.personalityNote ?? null,
    superpowers: user.insight?.superpowers ?? [],
    observations: user.insight?.observations ?? null,
  }

  const assessedAt = user.insight?.assessedAt
    ? new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeZone: 'Europe/Berlin' }).format(
        user.insight.assessedAt,
      )
    : null

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <Link href={`/admin/employees/${user.id}/edit`} className="hover:text-gray-900">
            ← Akte
          </Link>
          <span className="text-gray-300">|</span>
          <Link href="/admin/team-map" className="hover:text-gray-900">
            Team-Map
          </Link>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <h1 className="text-xl font-semibold text-gray-900">Insights – {user.name}</h1>
          <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700 ring-1 ring-indigo-100">
            vertraulich
          </span>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Nur für dich sichtbar. {member.personalityType !== 'UNKNOWN' && `Aktuell: ${personalityLabel(member.personalityType)}.`}
          {assessedAt && ` Zuletzt eingeschätzt am ${assessedAt}.`}
        </p>
      </div>

      <InsightForm member={member} />
    </div>
  )
}
