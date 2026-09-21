'use client'

import { Fragment, useState } from 'react'
import { useRouter } from 'next/navigation'
import { addPayrollAdjustment, deletePayrollAdjustment } from '@/app/actions/payrollAdjustments'
import { unwrap } from '@/lib/actionResult'

type Adjustment = { id: string; hours: number; reason: string; createdBy: string | null; createdAt: string }
type Row = { id: string; name: string; baseHours: number; adjustments: Adjustment[]; planBased?: boolean }

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

function totalHoursOf(r: Row): number {
  return r.baseHours + r.adjustments.reduce((sum, a) => sum + a.hours, 0)
}

export default function PayrollExportCard({ rows, from, to, fromLabel, toLabel }: Props) {
  const router = useRouter()
  const totals = new Map(rows.map((r) => [r.id, parseFloat(totalHoursOf(r).toFixed(2))]))
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(rows.filter((r) => (totals.get(r.id) ?? 0) > 0).map((r) => r.id))
  )
  const [tips, setTips] = useState('')
  const [adjustRow, setAdjustRow] = useState<string | null>(null)
  const [adjustHours, setAdjustHours] = useState('')
  const [adjustReason, setAdjustReason] = useState('')
  const [adjustError, setAdjustError] = useState('')
  const [adjustBusy, setAdjustBusy] = useState(false)

  const tipsNum = parseFloat(tips) || 0
  const selRows = rows.filter((r) => selected.has(r.id))
  const totalHours = selRows.reduce((sum, r) => sum + (totals.get(r.id) ?? 0), 0)
  const allSelected = selected.size === rows.length

  // Gleiche Verteilung wie die API: anteilig nach Stunden, letzte Zeile erhält den Rundungsrest
  const tipShares = new Map<string, number>()
  if (tipsNum > 0 && totalHours > 0) {
    let assigned = 0
    selRows.forEach((r, i) => {
      const h = totals.get(r.id) ?? 0
      const share = i === selRows.length - 1
        ? parseFloat((tipsNum - assigned).toFixed(2))
        : parseFloat(((h / totalHours) * tipsNum).toFixed(2))
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

  const openAdjust = (id: string | null) => {
    setAdjustRow(id)
    setAdjustHours('')
    setAdjustReason('')
    setAdjustError('')
  }

  const saveAdjust = async (userId: string) => {
    setAdjustError('')
    const hours = parseFloat(adjustHours.replace(',', '.'))
    if (!Number.isFinite(hours) || hours === 0) {
      setAdjustError('Bitte eine Stunden-Korrektur ungleich 0 angeben.')
      return
    }
    if (!adjustReason.trim()) {
      setAdjustError('Begründung ist erforderlich.')
      return
    }
    setAdjustBusy(true)
    try {
      unwrap(await addPayrollAdjustment({ userId, periodFrom: from, periodTo: to, hours, reason: adjustReason.trim() }))
      setAdjustRow(null)
      router.refresh()
    } catch (e) {
      setAdjustError(e instanceof Error ? e.message : 'Fehler')
    } finally {
      setAdjustBusy(false)
    }
  }

  const removeAdjust = async (id: string) => {
    if (!confirm('Korrektur wirklich löschen?')) return
    try {
      unwrap(await deletePayrollAdjustment(id))
      router.refresh()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Fehler beim Löschen')
    }
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
                <th className="px-3 py-2 text-right font-medium w-8" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const isSelected = selected.has(r.id)
                const total = totals.get(r.id) ?? 0
                const hasAdjustments = r.adjustments.length > 0
                return (
                  <Fragment key={r.id}>
                    <tr
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
                      <td className="px-3 py-2">
                        {r.name}
                        {r.planBased && (
                          <span className="ml-1.5 text-[10px] font-medium text-blue-600 bg-blue-50 rounded px-1 py-0.5 align-middle">
                            Plan
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {de(total)}
                        {hasAdjustments && (
                          <span className="ml-1 text-[10px] font-medium text-amber-600 bg-amber-50 rounded px-1 py-0.5 align-middle">
                            korrigiert
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {isSelected && tipShares.has(r.id) ? de(tipShares.get(r.id)!) : '–'}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {!r.planBased && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              openAdjust(adjustRow === r.id ? null : r.id)
                            }}
                            className="text-xs text-indigo-600 hover:text-indigo-800"
                            title="Stunden korrigieren"
                          >
                            ±Std.
                          </button>
                        )}
                      </td>
                    </tr>
                    {hasAdjustments && (
                      <tr className="border-t border-gray-50 bg-amber-50/40 text-xs text-gray-600">
                        <td className="px-3 py-1.5" />
                        <td className="px-3 py-1.5" colSpan={4}>
                          <ul className="space-y-0.5">
                            {r.adjustments.map((a) => (
                              <li key={a.id} className="flex items-center gap-2">
                                <span className="tabular-nums font-medium">
                                  {a.hours > 0 ? '+' : ''}{de(a.hours)} Std.
                                </span>
                                <span className="truncate">{a.reason}</span>
                                <span className="text-gray-400">
                                  ({a.createdAt}{a.createdBy ? `, ${a.createdBy}` : ''})
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    removeAdjust(a.id)
                                  }}
                                  className="ml-auto text-gray-400 hover:text-red-600"
                                  title="Korrektur löschen"
                                >
                                  ×
                                </button>
                              </li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    )}
                    {adjustRow === r.id && (
                      <tr className="border-t border-gray-50 bg-indigo-50/40">
                        <td className="px-3 py-2" />
                        <td className="px-3 py-2" colSpan={4}>
                          <div className="flex flex-wrap items-start gap-2" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="number"
                              step="0.25"
                              placeholder="± Std."
                              value={adjustHours}
                              onChange={(e) => setAdjustHours(e.target.value)}
                              className={`${inputClass} w-24`}
                            />
                            <input
                              type="text"
                              placeholder="Begründung (Pflicht, erscheint im Export)"
                              value={adjustReason}
                              onChange={(e) => setAdjustReason(e.target.value)}
                              className={`${inputClass} flex-1 min-w-[200px]`}
                            />
                            <button
                              type="button"
                              disabled={adjustBusy}
                              onClick={() => saveAdjust(r.id)}
                              className="px-3 py-2 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                            >
                              Speichern
                            </button>
                            <button
                              type="button"
                              onClick={() => setAdjustRow(null)}
                              className="px-3 py-2 text-xs text-gray-500 hover:text-gray-700"
                            >
                              Abbrechen
                            </button>
                          </div>
                          {adjustError && <p className="text-xs text-red-600 mt-1">{adjustError}</p>}
                        </td>
                      </tr>
                    )}
                  </Fragment>
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
                <td className="px-3 py-2" />
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
            Wird anteilig nach Stunden auf die ausgewählten MA verteilt.
            MA ohne Stunden im Zeitraum erscheinen nicht in der Datei.
            Bei <span className="font-medium">Plan</span>-Personen zählen die geplanten
            Schichten, sonst die bestätigten Stempelzeiten. Mit
            <span className="font-medium"> ±Std.</span> lässt sich die Stundenzahl mit
            Begründung korrigieren (z. B. vergessener Stempel) — die Begründung erscheint
            als eigene Spalte im Export.
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
        Spalten: Name · Ist-Stunden · Stundenlohn · Begründung
        (nur bei Korrekturen) · Trinkgeld
      </p>
    </div>
  )
}
