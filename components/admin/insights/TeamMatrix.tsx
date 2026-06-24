'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  PERSONALITY_KEYS,
  PERSONALITY_META,
  type InsightMember,
  type PersonalityKey,
} from '@/lib/insights'

function initials(name: string) {
  return name.split(' ').filter(Boolean).map((w) => w[0]?.toUpperCase()).slice(0, 2).join('')
}

// Position eines Mitglieds (in %) innerhalb seines Quadranten berechnen.
function layoutQuadrant(members: InsightMember[], cx: number, cy: number) {
  const n = members.length
  if (n === 0) return []
  const cols = Math.ceil(Math.sqrt(n))
  const rows = Math.ceil(n / cols)
  const spacing = Math.min(13, 30 / Math.max(cols, rows)) // % Abstand, je voller desto enger
  return members.map((m, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    const x = cx + (col - (cols - 1) / 2) * spacing
    const y = cy + (row - (rows - 1) / 2) * spacing
    return { member: m, x, y }
  })
}

export default function TeamMatrix({ members }: { members: InsightMember[] }) {
  const router = useRouter()
  const [hovered, setHovered] = useState<string | null>(null)

  const byType: Record<PersonalityKey, InsightMember[]> = {
    DRIVER: [], EXPRESSIVE: [], AMIABLE: [], ANALYTIC: [],
  }
  const unplaced: InsightMember[] = []
  for (const m of members) {
    if (m.personalityType === 'UNKNOWN') unplaced.push(m)
    else byType[m.personalityType].push(m)
  }

  const placed = PERSONALITY_KEYS.flatMap((key) => {
    const meta = PERSONALITY_META[key]
    return layoutQuadrant(byType[key], meta.center.x * 100, meta.center.y * 100).map((p) => ({
      ...p,
      key,
    }))
  })

  function go(id: string) {
    router.push(`/admin/employees/${id}/insights`)
  }

  return (
    <div>
      {/* ---- Chart (ab sm) ---- */}
      <div className="hidden sm:block">
        <div className="mx-auto max-w-[460px]">
          {/* obere Achse */}
          <div className="text-center text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1">
            Extrovertiert
          </div>
          <div className="flex items-stretch gap-2">
            {/* linke Achse */}
            <div className="flex items-center">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 [writing-mode:vertical-rl] rotate-180">
                Menschen
              </span>
            </div>

            <div className="relative flex-1 aspect-square rounded-2xl border border-gray-200 overflow-hidden bg-white">
              {/* Quadranten-Hintergründe */}
              {PERSONALITY_KEYS.map((key) => {
                const m = PERSONALITY_META[key]
                const left = m.quadrant.x === 'people' ? '0%' : '50%'
                const top = m.quadrant.y === 'extro' ? '0%' : '50%'
                return (
                  <div
                    key={key}
                    className="absolute w-1/2 h-1/2 p-2.5"
                    style={{ left, top, backgroundColor: `${m.color}0d` }}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} />
                      <span className="text-xs font-semibold text-gray-700">{m.label}</span>
                      <span className="text-xs text-gray-400">{byType[key].length}</span>
                    </div>
                  </div>
                )
              })}

              {/* Mittelkreuz */}
              <div className="absolute inset-x-0 top-1/2 h-px bg-gray-200" />
              <div className="absolute inset-y-0 left-1/2 w-px bg-gray-200" />

              {/* Mitglieder */}
              {placed.map(({ member, x, y, key }) => {
                const m = PERSONALITY_META[key]
                const isHover = hovered === member.id
                return (
                  <button
                    key={member.id}
                    type="button"
                    onMouseEnter={() => setHovered(member.id)}
                    onMouseLeave={() => setHovered((h) => (h === member.id ? null : h))}
                    onClick={() => go(member.id)}
                    className="absolute -translate-x-1/2 -translate-y-1/2 group focus:outline-none"
                    style={{ left: `${x}%`, top: `${y}%`, zIndex: isHover ? 30 : 10 }}
                  >
                    <span
                      className="flex items-center justify-center w-8 h-8 rounded-full text-[10px] font-bold text-white shadow-sm ring-2 ring-white transition-transform group-hover:scale-110"
                      style={{ backgroundColor: m.color }}
                    >
                      {initials(member.name)}
                    </span>
                    {isHover && (
                      <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 w-max max-w-[180px] rounded-lg bg-gray-900 px-2.5 py-1.5 text-left shadow-lg pointer-events-none">
                        <span className="block text-xs font-semibold text-white">{member.name}</span>
                        <span className="block text-[10px] text-gray-300">{m.label}</span>
                        {member.superpowers.length > 0 && (
                          <span className="block text-[10px] text-gray-400 mt-0.5 leading-snug">
                            {member.superpowers.join(' · ')}
                          </span>
                        )}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* rechte Achse */}
            <div className="flex items-center">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 [writing-mode:vertical-rl]">
                Aufgaben
              </span>
            </div>
          </div>
          {/* untere Achse */}
          <div className="text-center text-[11px] font-semibold uppercase tracking-wide text-gray-400 mt-1">
            Introvertiert
          </div>
        </div>
      </div>

      {/* ---- Quadranten-Liste (mobil) ---- */}
      <div className="sm:hidden space-y-3">
        {PERSONALITY_KEYS.map((key) => {
          const m = PERSONALITY_META[key]
          return (
            <div key={key} className="rounded-xl border border-gray-200 p-3" style={{ backgroundColor: `${m.color}0a` }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: m.color }} />
                <span className="text-sm font-semibold text-gray-900">{m.label}</span>
                <span className="text-xs text-gray-400">· {byType[key].length}</span>
              </div>
              {byType[key].length === 0 ? (
                <p className="text-xs text-gray-400">Niemand zugeordnet.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {byType[key].map((member) => (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => go(member.id)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-gray-700 ring-1 ring-gray-200"
                    >
                      <span
                        className="flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-bold text-white"
                        style={{ backgroundColor: m.color }}
                      >
                        {initials(member.name)}
                      </span>
                      {member.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Noch nicht eingeordnet */}
      {unplaced.length > 0 && (
        <div className="mt-4 rounded-xl border border-dashed border-gray-200 p-3">
          <p className="text-xs font-medium text-gray-500 mb-2">
            Noch nicht eingeordnet ({unplaced.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {unplaced.map((member) => (
              <button
                key={member.id}
                type="button"
                onClick={() => go(member.id)}
                className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-600 ring-1 ring-gray-200 hover:bg-gray-100 transition"
              >
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-300 text-[9px] font-bold text-white">
                  {initials(member.name)}
                </span>
                {member.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
