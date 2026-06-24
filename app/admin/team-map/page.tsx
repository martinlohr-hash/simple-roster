import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { getSession } from '@/app/actions/auth'
import { isSuperAdmin } from '@/lib/session'
import TeamMatrix from '@/components/admin/insights/TeamMatrix'
import GapPanel from '@/components/admin/insights/GapPanel'
import SuperpowerExplorer from '@/components/admin/insights/SuperpowerExplorer'
import { composeTeam, type InsightMember, type PersonalityValue } from '@/lib/insights'

export const metadata = { title: 'Team-Map' }

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 sm:p-6">
      <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      {subtitle && <p className="text-xs text-gray-500 mt-1 mb-4">{subtitle}</p>}
      {!subtitle && <div className="mb-4" />}
      {children}
    </section>
  )
}

export default async function TeamMapPage() {
  // Vertraulich: nur SUPER_ADMIN. Für alle anderen 404.
  const session = await getSession()
  if (!session || !isSuperAdmin(session.role)) notFound()

  const users = await prisma.user.findMany({
    where: { role: { not: 'SUPER_ADMIN' } },
    select: {
      id: true,
      name: true,
      insight: {
        select: {
          personalityType: true,
          personalityNote: true,
          superpowers: true,
          assessedAt: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  })

  const members: InsightMember[] = users.map((u) => ({
    id: u.id,
    name: u.name,
    personalityType: (u.insight?.personalityType ?? 'UNKNOWN') as PersonalityValue,
    personalityNote: u.insight?.personalityNote ?? null,
    superpowers: u.insight?.superpowers ?? [],
    assessedAt: u.insight?.assessedAt ? u.insight.assessedAt.toISOString() : null,
  }))

  const comp = composeTeam(members)

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl">
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold text-gray-900">Team-Map</h1>
          <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700 ring-1 ring-indigo-100">
            vertraulich
          </span>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Persönlichkeitstypen & Stärken des Teams. Ein gutes Team braucht alle vier Typen –
          Driver, Expressive, Amiable, Analytic. Nur für dich sichtbar.
        </p>
      </div>

      <div className="space-y-5">
        <Card
          title="Team-Matrix"
          subtitle="Klicke auf eine Person, um ihre Einschätzung zu bearbeiten."
        >
          <TeamMatrix members={members} />
        </Card>

        <Card title="Balance & Lücken">
          <GapPanel comp={comp} />
        </Card>

        <Card
          title="Superpowers"
          subtitle="Wer kann was? Suche über alle erfassten Stärken."
        >
          <SuperpowerExplorer members={members} />
        </Card>
      </div>
    </div>
  )
}
