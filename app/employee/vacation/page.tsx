import { redirect } from 'next/navigation'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { getSession } from '@/app/actions/auth'
import { prisma } from '@/lib/db'
import { getCurrentBalance } from '@/lib/vacationBalance'
import { calcVacationEntitlement, calcVacationUsed, calcVacationRemaining } from '@/lib/vacation'
import VacationForm from './VacationForm'

const statusLabel: Record<string, { label: string; cls: string }> = {
  PENDING: { label: 'Ausstehend', cls: 'bg-amber-100 text-amber-700' },
  APPROVED: { label: 'Genehmigt', cls: 'bg-green-100 text-green-700' },
  REJECTED: { label: 'Abgelehnt', cls: 'bg-red-100 text-red-700' },
}

export default async function EmployeeVacationPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const [user, vacationRequests] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { vacationDaysPerYear: true, startDate: true },
    }),
    prisma.vacationRequest.findMany({
      where: { userId: session.userId },
      orderBy: { startDate: 'desc' },
    }),
  ])

  if (!user) redirect('/login')
  const balance = await getCurrentBalance(session.userId)

  const entitlement = calcVacationEntitlement(user, balance)
  const used = calcVacationUsed(vacationRequests)
  const remaining = calcVacationRemaining(user, vacationRequests, balance)
  const pct = entitlement > 0 ? used / entitlement : 0
  const light = pct >= 1 ? 'red' : pct >= 0.8 ? 'yellow' : 'green'

  return (
    <div className="space-y-5 pb-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Urlaubskonto {new Date().getFullYear()}</h2>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="text-2xl font-bold text-gray-900">{entitlement}</div>
            <div className="text-xs text-gray-500 mt-0.5">Anspruch</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="text-2xl font-bold text-gray-900">{used}</div>
            <div className="text-xs text-gray-500 mt-0.5">Verbraucht</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <div className={`text-2xl font-bold ${light === 'red' ? 'text-red-600' : light === 'yellow' ? 'text-yellow-600' : 'text-green-600'}`}>
              {remaining}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">Verbleibend</div>
          </div>
        </div>
        {entitlement > 0 && (
          <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${light === 'red' ? 'bg-red-500' : light === 'yellow' ? 'bg-yellow-400' : 'bg-green-500'}`}
              style={{ width: `${Math.min(pct * 100, 100)}%` }}
            />
          </div>
        )}
      </div>

      <VacationForm />

      {vacationRequests.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <h2 className="text-sm font-semibold text-gray-900">Meine Anträge</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {vacationRequests.map((v) => {
              const s = statusLabel[v.status]
              return (
                <div key={v.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {format(v.startDate, 'd. MMM', { locale: de })} – {format(v.endDate, 'd. MMM yyyy', { locale: de })}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {v.workdays} Werktag{v.workdays !== 1 ? 'e' : ''}
                      {v.note ? ` · ${v.note}` : ''}
                    </div>
                  </div>
                  <span className={`shrink-0 inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${s.cls}`}>
                    {s.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
