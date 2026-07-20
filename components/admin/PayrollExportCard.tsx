'use client'

import { useState } from 'react'

type Row = { id: string; name: string; hours: number }

type Props = {
  rows: Row[]
  from: string
  to: string
  fromLabel: string
  toLabel: string
}

const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'

const de = (n: number) =>
  n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function PayrollExportCard({ rows, from, to, fromLabel, toLabel }: Props) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(rows.filter((r) => r.hours > 0).map((r) => r.id))
  )
  const [tips, setTips] = useState('')

  const tipsNum = parseFloat(tips) || 0
  const selRows = rows.filter((r) => selected.has(r.id))
  const totalHours = selRows.reduce((sum, r) => sum + r.hours, 0)
  const allSelected = selected.size === rows.length

  // Gleiche Verteilung wie die API: anteilig nach Stunden, letzte Zeile erhält den Rundungsrest
  const tipShares = new Map<string, number>()
  if (tipsNum > 0 && totalHours > 0) {
    let assigned = 0
    selRows.forEach((r, i) => {
      const share = i === selRows.length - 1
        ? parseFloat((tipsNum - assigned).toFixed(2))
        : parseFloat(((r.hours / totalHours) * tipsNum).toFixed(2))
      assigned += share
      tipShares.set(r.id, share)
    })
  }

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)))
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mt-8">
      <h2 className="text-base font-semibold text-gray-900">Lohn-Export (21.–20.)</h2>
      <p className="text-xs text-gray-500 mt-1 mb-4">
        Zeitraum {fromLabel} – {toLabel}, alle Standorte. Eine Zeile pro Mitarbeiter mit
        kumulierten Ist-Stunden und anteiligem Trinkgeld — abwählen, wer nicht exportiert
        werden soll.
      </p>

      <form action="/api/export" method="GET" className="space-y-4">
        <input type="hidden" name="from" value={from} />
        <input type="hidden" name="to" value={to} />
        <input type="hidden" name="summary" value="1" />
        <input type="hidden" name="format" value="excel" />
        {selRows.map((r) => (
          <input key={r.id} type="hidden" name="userId" value={r.id} />
        ))}

        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500">
                <th className="px-3 py-2 text-left font-medium w-8">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="rounded"
                    title={allSelected ? 'Alle abwählen' : 'Alle auswählen'}
                  />
                </th>
                <th className="px-3 py-2 text-left font-medium">Name</th>
                <th className="px-3 py-2 text-right font-medium">Ist-Stunden</th>
                <th className="px-3 py-2 text-right font-medium">Trinkgeld (€)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const isSelected = selected.has(r.id)
                return (
                  <tr
                    key={r.id}
                    onClick={() => toggle(r.id)}
                    className={`border-t border-gray-100 cursor-pointer ${isSelected ? '' : 'text-gray-400'}`}
                  >
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggle(r.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded"
                      />
                    </td>
                    <td className="px-3 py-2">{r.name}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{de(r.hours)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {isSelected && tipShares.has(r.id) ? de(tipShares.get(r.id)!) : '–'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-200 bg-gray-50 font-medium">
                <td className="px-3 py-2" />
                <td className="px-3 py-2">{selRows.length} von {rows.length} ausgewählt</td>
                <td className="px-3 py-2 text-right tabular-nums">{de(totalHours)}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {tipsNum > 0 && totalHours > 0 ? de(tipsNum) : '–'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Trinkgeld gesamt (€) im Zeitraum
          </label>
          <input
            type="number"
            name="tips"
            min="0"
            step="0.01"
            placeholder="z.B. 350.00"
            required
            value={tips}
            onChange={(e) => setTips(e.target.value)}
            className={inputClass}
          />
          <p className="text-xs text-gray-400 mt-1">
            Wird anteilig nach geleisteten Stunden auf die ausgewählten MA verteilt.
            MA ohne Stunden im Zeitraum erscheinen nicht in der Datei.
          </p>
        </div>

        <button
          type="submit"
          disabled={selRows.length === 0}
          className="w-full py-2.5 px-4 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition active:scale-[0.97] flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Lohn-Export als Excel herunterladen
        </button>
      </form>

      <p className="text-xs text-gray-400 mt-4">
        Spalten: Name · Ist-Stunden · Stundenlohn · NK-Quote · Lohnkosten · Trinkgeld
      </p>
    </div>
  )
}
