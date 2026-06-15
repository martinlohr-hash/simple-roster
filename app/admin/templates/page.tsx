import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { prisma } from '@/lib/db'
import { deleteTemplate } from '@/app/actions/templates'
import DeleteTemplateButton from '@/components/admin/DeleteTemplateButton'

export default async function TemplatesPage() {
  const templates = await prisma.shiftTemplate.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      entries: {
        include: { user: true, location: true },
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      },
    },
  })

  const DAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Vorlagen</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gespeicherte Wochenpläne, die du auf jede Woche anwenden kannst</p>
        </div>
      </div>

      {templates.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-10 text-center">
          <div className="text-gray-400 text-sm">Noch keine Vorlagen gespeichert.</div>
          <p className="text-gray-400 text-xs mt-1">Im Dienstplan auf «Als Vorlage speichern» klicken.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {templates.map((t) => (
            <div key={t.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div>
                  <h2 className="font-semibold text-gray-900">{t.name}</h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Erstellt {format(t.createdAt, 'd. MMM yyyy', { locale: de })} · {t.entries.length} Schichten
                  </p>
                </div>
                <DeleteTemplateButton id={t.id} name={t.name} />
              </div>
              <div className="divide-y divide-gray-50">
                {t.entries.map((e) => (
                  <div key={e.id} className="flex items-center gap-4 px-5 py-2.5">
                    <span className="text-xs font-medium text-gray-500 w-6">{DAYS[e.dayOfWeek]}</span>
                    <span className="text-sm text-gray-900">{e.user?.name ?? '—'}</span>
                    <span className="text-xs text-gray-500">{e.startTime}–{e.endTime}</span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full text-white font-medium"
                      style={{ backgroundColor: e.location.color }}
                    >
                      {e.location.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
