import { prisma } from '@/lib/db'
import CoverageRulesManager from '@/components/admin/CoverageRulesManager'
import LocationsManager from '@/components/admin/LocationsManager'

export default async function SettingsPage() {
  const [rules, locations] = await Promise.all([
    prisma.coverageRule.findMany({ orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }] }),
    prisma.location.findMany({ orderBy: { name: 'asc' } }),
  ])

  const rulesJson = rules.map((r) => ({
    id: r.id,
    dayOfWeek: r.dayOfWeek,
    startTime: r.startTime,
    endTime: r.endTime,
    minStaff: r.minStaff,
    locationId: r.locationId,
    label: r.label,
  }))

  const locationsJson = locations.map((l) => ({ id: l.id, name: l.name, color: l.color }))

  return (
    <div className="p-6 max-w-3xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Einstellungen</h1>
        <p className="text-sm text-gray-500 mt-0.5">Standorte und Besetzungs-Vorgaben konfigurieren</p>
      </div>
      <LocationsManager locations={locationsJson} />
      <CoverageRulesManager rules={rulesJson} locations={locationsJson} />
    </div>
  )
}
