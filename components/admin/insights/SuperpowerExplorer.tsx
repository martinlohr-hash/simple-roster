'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { IconSearch, IconBolt } from '@tabler/icons-react'
import { aggregateSuperpowers, type InsightMember } from '@/lib/insights'

export default function SuperpowerExplorer({ members }: { members: InsightMember[] }) {
  const router = useRouter()
  const [q, setQ] = useState('')

  const all = useMemo(() => aggregateSuperpowers(members), [members])

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return all
    return all.filter(
      (e) =>
        e.power.toLowerCase().includes(term) ||
        e.members.some((m) => m.name.toLowerCase().includes(term)),
    )
  }, [all, q])

  if (all.length === 0) {
    return (
      <p className="text-sm text-gray-400">
        Noch keine Superpowers erfasst. Trage sie in den einzelnen Mitarbeiterakten ein.
      </p>
    )
  }

  return (
    <div>
      <div className="relative mb-4">
        <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={'Superpower oder Name suchen … (z. B. „Zahlen", „Event")'}
          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-gray-400">Keine Treffer für „{q}".</p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((entry) => (
            <li
              key={entry.power}
              className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-xl border border-gray-100 bg-white p-3"
            >
              <div className="flex items-center gap-2 sm:w-56 shrink-0">
                <IconBolt size={15} className="text-indigo-500 shrink-0" />
                <span className="text-sm font-medium text-gray-900">{entry.power}</span>
                <span className="text-xs text-gray-400">· {entry.members.length}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {entry.members.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => router.push(`/admin/employees/${m.id}/insights`)}
                    className="rounded-full bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700 ring-1 ring-gray-200 hover:bg-gray-100 transition"
                  >
                    {m.name}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
