'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

type BugReport = {
  id: string
  area: string
  description: string
  status: 'OPEN' | 'RESOLVED'
  reportedBy: string | null
  createdAt: string
}

export default function BugsPage() {
  const [reports, setReports] = useState<BugReport[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'ALL' | 'OPEN' | 'RESOLVED'>('OPEN')

  useEffect(() => {
    fetch('/api/bug-reports')
      .then((r) => r.json())
      .then((data) => { setReports(data); setLoading(false) })
  }, [])

  async function toggleStatus(report: BugReport) {
    const next = report.status === 'OPEN' ? 'RESOLVED' : 'OPEN'
    const res = await fetch(`/api/bug-reports/${report.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    })
    if (res.ok) {
      const updated = await res.json()
      setReports((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
    }
  }

  const visible = reports.filter((r) => filter === 'ALL' || r.status === filter)
  const openCount = reports.filter((r) => r.status === 'OPEN').length

  return (
    <div className="p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Fehlerberichte</h1>
            {openCount > 0 && (
              <p className="text-sm text-gray-500 mt-0.5">{openCount} offen</p>
            )}
          </div>
          <div className="flex gap-1 rounded-lg border border-gray-200 p-0.5 bg-gray-50">
            {(['OPEN', 'ALL', 'RESOLVED'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  filter === f
                    ? 'bg-white text-gray-800 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {f === 'OPEN' ? 'Offen' : f === 'ALL' ? 'Alle' : 'Erledigt'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-16 text-sm text-gray-400">Wird geladen…</div>
        ) : visible.length === 0 ? (
          <div className="text-center py-16 text-sm text-gray-400">
            {filter === 'OPEN' ? 'Keine offenen Fehler 🎉' : 'Keine Einträge'}
          </div>
        ) : (
          <div className="space-y-2">
            {visible.map((r) => (
              <div
                key={r.id}
                className={`rounded-xl border px-5 py-4 flex gap-4 items-start transition-colors ${
                  r.status === 'RESOLVED'
                    ? 'border-gray-100 bg-gray-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <button
                  onClick={() => toggleStatus(r)}
                  title={r.status === 'OPEN' ? 'Als erledigt markieren' : 'Wieder öffnen'}
                  className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                    r.status === 'RESOLVED'
                      ? 'border-green-500 bg-green-500'
                      : 'border-gray-300 hover:border-green-400 bg-white'
                  }`}
                >
                  {r.status === 'RESOLVED' && (
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600">
                      {r.area}
                    </span>
                    {r.reportedBy && (
                      <span className="text-xs text-gray-400">{r.reportedBy}</span>
                    )}
                    <span className="text-xs text-gray-300 ml-auto shrink-0">
                      {format(new Date(r.createdAt), 'dd. MMM, HH:mm', { locale: de })}
                    </span>
                  </div>
                  <p className={`text-sm ${r.status === 'RESOLVED' ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                    {r.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
