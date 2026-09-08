'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { IconChevronLeft, IconChevronRight, IconTrash, IconPlus, IconAlertTriangle, IconCircleCheck, IconLock } from '@tabler/icons-react'
import { adminCreateTimeEntry, adminUpdateTimeEntry, adminDeleteTimeEntry, releaseDay, unreleaseDay } from '@/app/actions/timesheets'
import { unwrap } from '@/lib/actionResult'

type Release = { releasedAt: string; releasedBy: string | null; hours: number }

type Entry = {
  id: string
  userId: string
  userName: string
  locationId: string
  locationName: string
  checkin: string
  checkout: string
  hours: number | null
  deductedMinutes?: number
}
type Option = { id: string; name: string; primaryLocationId?: string | null }
type Loc = { id: string; name: string }

function fmtHours(h: number): string {
  return h.toFixed(2).replace('.', ',')
}

function diffHours(checkin: string, checkout: string): number | null {
  if (!checkin || !checkout) return null
  const [ch, cm] = checkin.split(':').map(Number)
  const [oh, om] = checkout.split(':').map(Number)
  let mins = oh * 60 + om - (ch * 60 + cm)
  if (mins <= 0) mins += 24 * 60 // über Mitternacht
  return mins / 60
}

function shiftDate(dateStr: string, deltaDays: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d + deltaDays)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

function todayStr(): string {
  const dt = new Date()
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

function germanDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return dt.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

export default function TimesheetEditor({
  date,
  entries,
  users,
  locations,
  totalHours,
  openCount,
  release,
}: {
  date: string
  entries: Entry[]
  users: Option[]
  locations: Loc[]
  totalHours: number
  openCount: number
  release: Release | null
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const totalDeductedMinutes = entries.reduce((sum, e) => sum + (e.deductedMinutes ?? 0), 0)

  function goToDate(d: string) {
    startTransition(() => router.push(`/admin/timesheets?date=${d}`))
  }

  function refresh() {
    startTransition(() => router.refresh())
  }

  return (
    <div className="space-y-5">
      {/* Datums-Navigation */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => goToDate(shiftDate(date, -1))}
          className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 active:scale-95 transition"
          title="Vorheriger Tag"
        >
          <IconChevronLeft size={16} />
        </button>
        <input
          type="date"
          value={date}
          onChange={(e) => e.target.value && goToDate(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          onClick={() => goToDate(shiftDate(date, 1))}
          className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 active:scale-95 transition"
          title="Nächster Tag"
        >
          <IconChevronRight size={16} />
        </button>
        {date !== todayStr() && (
          <button
            onClick={() => goToDate(todayStr())}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition"
          >
            Heute
          </button>
        )}
        <span className="text-sm text-gray-400 ml-1 hidden sm:inline">{germanDate(date)}</span>
      </div>

      {/* Gesamtstunden-Karte */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex items-baseline justify-between">
        <div>
          <div className="text-xs text-indigo-700/70 font-medium">Tages-Gesamtstunden</div>
          <div className="text-xs text-indigo-700/50 mt-0.5">
            {release ? 'Snapshot in der Tabelle' : 'erst nach Freigabe in der Tabelle'}
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-semibold text-indigo-900 tabular-nums">{fmtHours(totalHours)} h</div>
          {totalDeductedMinutes > 0 && (
            <div className="text-xs text-indigo-700/60 mt-0.5">
              bereits abzgl. {totalDeductedMinutes} Min. gesetzl. Pause (§4 ArbZG)
            </div>
          )}
        </div>
      </div>

      {openCount > 0 && (
        <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          <IconAlertTriangle size={16} className="shrink-0" />
          {openCount === 1 ? '1 Eintrag ohne Ende' : `${openCount} Einträge ohne Ende`} – bitte „Bis" nachtragen, sonst zählt er nicht.
        </div>
      )}

      <ReleaseBar
        day={date}
        totalHours={totalHours}
        openCount={openCount}
        release={release}
        onDone={refresh}
        disabled={isPending}
      />

      {/* Einträge */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="hidden sm:grid grid-cols-[1.4fr_1.2fr_auto_auto_auto_auto] gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500">
          <span>Mitarbeiter</span>
          <span>Standort</span>
          <span className="text-center">Von</span>
          <span className="text-center">Bis</span>
          <span className="text-right">Std.</span>
          <span />
        </div>
        <div className="divide-y divide-gray-100">
          {entries.length === 0 && (
            <p className="px-4 py-6 text-sm text-gray-400 text-center">Keine Stempel-Einträge an diesem Tag</p>
          )}
          {entries.map((entry) => (
            <EntryRow key={entry.id} entry={entry} date={date} locations={locations} onDone={refresh} disabled={isPending} />
          ))}
        </div>

        {/* Neuer Eintrag */}
        <AddRow date={date} users={users} locations={locations} onDone={refresh} disabled={isPending} />
      </div>
    </div>
  )
}

function ReleaseBar({
  day,
  totalHours,
  openCount,
  release,
  onDone,
  disabled,
}: {
  day: string
  totalHours: number
  openCount: number
  release: Release | null
  onDone: () => void
  disabled: boolean
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const released = !!release
  const changed = released && Math.abs(release!.hours - totalHours) > 0.001

  async function doRelease() {
    setError('')
    setBusy(true)
    try {
      let res = await releaseDay(day)
      if (res.missingStamps && res.missingStamps.length > 0) {
        const list = res.missingStamps
          .map((m) => `– ${m.name}: ${m.hours.toFixed(2).replace('.', ',')} Std.`)
          .join('\n')
        const proceed = confirm(
          `Diese Schichten sind vorbei, haben aber keinen Stempel:\n\n${list}\n\n` +
            `Ohne Korrektur fehlen diese Stunden im Lohn-Export! Bitte erst per Schicht-Klick ` +
            `nachtragen ("Ist-Zeiten"), oder OK für trotzdem freigeben.`,
        )
        if (!proceed) {
          setBusy(false)
          return
        }
        res = await releaseDay(day, true)
      }
      if (res.suggestedBreaks && res.suggestedBreaks.length > 0) {
        const list = res.suggestedBreaks
          .map((b) => `– ${b.name}: ${fmtHours(b.hours)} Std. → ${b.minutes} Min. Pause`)
          .join('\n')
        const applyBreaks = confirm(
          `Gesetzliche Pausenzeit (§4 ArbZG) noch nicht abgezogen:\n\n${list}\n\n` +
            `OK = jetzt abziehen und freigeben, Abbrechen = ohne Abzug freigeben.`,
        )
        const breaksMap = applyBreaks
          ? Object.fromEntries(res.suggestedBreaks.map((b) => [b.userId, b.minutes]))
          : {}
        res = await releaseDay(day, true, breaksMap)
      }
      unwrap(res)
      onDone()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler')
    } finally {
      setBusy(false)
    }
  }

  async function doUnrelease() {
    if (!confirm('Freigabe aufheben? Der Tag wird dann nicht mehr in die Tabelle übertragen.')) return
    setError('')
    setBusy(true)
    try {
      unwrap(await unreleaseDay(day))
      onDone()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler')
      setBusy(false)
    }
  }

  if (!released) {
    return (
      <div className="rounded-xl border border-gray-200 p-4 flex items-center justify-between gap-3">
        <div className="text-sm text-gray-600">
          {openCount > 0 ? (
            <span className="text-amber-700">Erst alle offenen Einträge schließen, dann freigeben.</span>
          ) : (
            <>Noch nicht freigegeben – wird <strong>nicht</strong> in die Tabelle übertragen.</>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          <button
            onClick={doRelease}
            disabled={busy || disabled || openCount > 0}
            className="flex items-center gap-1.5 text-sm font-medium px-3.5 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition shrink-0"
          >
            <IconLock size={15} /> {busy ? '…' : 'Tag freigeben'}
          </button>
          {error && <span className="text-xs text-red-600">{error}</span>}
        </div>
      </div>
    )
  }

  const releasedAt = new Date(release!.releasedAt).toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className={`rounded-xl border p-4 ${changed ? 'border-amber-200 bg-amber-50' : 'border-green-200 bg-green-50'}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm">
          <IconCircleCheck size={18} className={changed ? 'text-amber-600' : 'text-green-600'} />
          <div>
            <div className={`font-medium ${changed ? 'text-amber-900' : 'text-green-900'}`}>
              Freigegeben mit {fmtHours(release!.hours)} h
            </div>
            <div className={`text-xs ${changed ? 'text-amber-700/70' : 'text-green-700/70'}`}>
              {releasedAt}{release!.releasedBy ? ` · ${release!.releasedBy}` : ''}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {changed && (
            <button
              onClick={doRelease}
              disabled={busy || disabled}
              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-40 active:scale-95 transition"
            >
              {busy ? '…' : `Neu freigeben (${fmtHours(totalHours)} h)`}
            </button>
          )}
          <button
            onClick={doUnrelease}
            disabled={busy || disabled}
            className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1.5 disabled:opacity-40"
          >
            Aufheben
          </button>
        </div>
      </div>
      {changed && (
        <p className="text-xs text-amber-700 mt-2">
          Die Stunden wurden seit der Freigabe geändert (aktuell {fmtHours(totalHours)} h). „Neu freigeben" überträgt den neuen Wert.
        </p>
      )}
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  )
}

function EntryRow({
  entry,
  date,
  locations,
  onDone,
  disabled,
}: {
  entry: Entry
  date: string
  locations: Loc[]
  onDone: () => void
  disabled: boolean
}) {
  const [checkin, setCheckin] = useState(entry.checkin)
  const [checkout, setCheckout] = useState(entry.checkout)
  const [locationId, setLocationId] = useState(entry.locationId)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const dirty = checkin !== entry.checkin || checkout !== entry.checkout || locationId !== entry.locationId
  const hours = diffHours(checkin, checkout)

  async function save() {
    setError('')
    if (!checkin) {
      setError('Beginn fehlt')
      return
    }
    setSaving(true)
    try {
      unwrap(await adminUpdateTimeEntry({ id: entry.id, date, checkin, checkout: checkout || undefined, locationId }))
      onDone()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler')
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!confirm(`Eintrag von ${entry.userName} löschen?`)) return
    setSaving(true)
    try {
      unwrap(await adminDeleteTimeEntry(entry.id))
      onDone()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler')
      setSaving(false)
    }
  }

  return (
    <div className="px-4 py-2.5 sm:grid sm:grid-cols-[1.4fr_1.2fr_auto_auto_auto_auto] sm:gap-2 sm:items-center flex flex-wrap gap-2">
      <span className="text-sm font-medium text-gray-900 w-full sm:w-auto">{entry.userName}</span>
      <select
        value={locationId}
        onChange={(e) => setLocationId(e.target.value)}
        className="text-sm text-gray-700 border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        {locations.map((l) => (
          <option key={l.id} value={l.id}>{l.name}</option>
        ))}
      </select>
      <input
        type="time"
        value={checkin}
        onChange={(e) => setCheckin(e.target.value)}
        className="text-sm text-gray-900 border border-gray-200 rounded-lg px-2 py-1.5 w-[6.5rem] focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      <input
        type="time"
        value={checkout}
        onChange={(e) => setCheckout(e.target.value)}
        placeholder="–"
        className={`text-sm text-gray-900 border rounded-lg px-2 py-1.5 w-[6.5rem] focus:outline-none focus:ring-2 focus:ring-indigo-500 ${checkout ? 'border-gray-200' : 'border-amber-300 bg-amber-50'}`}
      />
      <span className="text-sm text-gray-700 text-right tabular-nums w-14">
        {hours != null ? `${fmtHours(hours)}` : '–'}
        {!!entry.deductedMinutes && (
          <span className="block text-[10px] text-amber-600 font-normal" title="Gesetzl. Pausenabzug (§4 ArbZG)">
            −{entry.deductedMinutes} Min Pause
          </span>
        )}
      </span>
      <div className="flex items-center gap-1 justify-end">
        {dirty && (
          <button
            onClick={save}
            disabled={saving || disabled}
            className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 active:scale-95 transition"
          >
            {saving ? '…' : 'Speichern'}
          </button>
        )}
        <button
          onClick={remove}
          disabled={saving || disabled}
          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50 transition"
          title="Löschen"
        >
          <IconTrash size={15} />
        </button>
      </div>
      {error && <span className="text-xs text-red-600 w-full text-right">{error}</span>}
    </div>
  )
}

function AddRow({
  date,
  users,
  locations,
  onDone,
  disabled,
}: {
  date: string
  users: Option[]
  locations: Loc[]
  onDone: () => void
  disabled: boolean
}) {
  const [open, setOpen] = useState(false)
  const [userId, setUserId] = useState('')
  const [locationId, setLocationId] = useState('')
  const [checkin, setCheckin] = useState('')
  const [checkout, setCheckout] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function pickUser(id: string) {
    setUserId(id)
    const u = users.find((x) => x.id === id)
    if (u?.primaryLocationId && !locationId) setLocationId(u.primaryLocationId)
  }

  async function add() {
    setError('')
    if (!userId || !locationId || !checkin) {
      setError('Mitarbeiter, Standort und Beginn erforderlich')
      return
    }
    setSaving(true)
    try {
      unwrap(await adminCreateTimeEntry({ userId, locationId, date, checkin, checkout: checkout || undefined }))
      setUserId('')
      setLocationId('')
      setCheckin('')
      setCheckout('')
      setOpen(false)
      onDone()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler')
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-1.5 px-4 py-3 text-sm font-medium text-indigo-600 hover:bg-indigo-50/50 border-t border-gray-100 transition"
      >
        <IconPlus size={15} /> Eintrag nachtragen
      </button>
    )
  }

  return (
    <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50 space-y-2">
      <div className="flex flex-wrap gap-2 items-center">
        <select
          value={userId}
          onChange={(e) => pickUser(e.target.value)}
          className="text-sm text-gray-700 border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Mitarbeiter …</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
        <select
          value={locationId}
          onChange={(e) => setLocationId(e.target.value)}
          className="text-sm text-gray-700 border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Standort …</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
        <input type="time" value={checkin} onChange={(e) => setCheckin(e.target.value)} title="Von"
          className="text-sm text-gray-900 border border-gray-200 rounded-lg px-2 py-1.5 w-[6.5rem] focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        <input type="time" value={checkout} onChange={(e) => setCheckout(e.target.value)} title="Bis"
          className="text-sm text-gray-900 border border-gray-200 rounded-lg px-2 py-1.5 w-[6.5rem] focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        <button
          onClick={add}
          disabled={saving || disabled}
          className="text-xs font-medium px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 active:scale-95 transition"
        >
          {saving ? '…' : 'Hinzufügen'}
        </button>
        <button onClick={() => setOpen(false)} className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1.5">
          Abbrechen
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
