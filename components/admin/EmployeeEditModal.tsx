'use client'

import { useEffect, useRef, useState } from 'react'
import { format } from 'date-fns'

type Location = { id: string; name: string }
type User = {
  id: string; name: string; email: string; role: string
  hourlyRate: number; monthlyRate: number | null; overheadPercent: number
  maxHoursWeek: number | null; maxHoursMonth: number | null
  vacationDaysPerYear: number
  primaryLocationId: string | null
  startDate: string | null; endDate: string | null
  phone: string | null; address: string | null; birthday: string | null
}

type Props = {
  userId: string
  locations: Location[]
  onClose: () => void
  onSaved: () => void
  isSuperAdmin?: boolean
}

function toDateInput(val: string | null): string {
  if (!val) return ''
  return format(new Date(val), 'yyyy-MM-dd')
}

const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
const selectClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white'

function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export default function EmployeeEditModal({ userId, locations, onClose, onSaved, isSuperAdmin }: Props) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [salaryType, setSalaryType] = useState<'hourly' | 'monthly'>('hourly')
  const passwordRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch(`/api/employees/${userId}`)
      .then((r) => r.json())
      .then((data: User) => {
        setUser(data)
        setSalaryType(data.monthlyRate != null && data.monthlyRate > 0 ? 'monthly' : 'hourly')
        setLoading(false)
      })
  }, [userId])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const fd = new FormData(e.currentTarget)
    const body = Object.fromEntries(fd.entries())
    const res = await fetch(`/api/employees/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, salaryType }),
    })
    if (res.ok) {
      onSaved()
    } else {
      const data = await res.json()
      setError(data.error || 'Fehler beim Speichern.')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            {user ? user.name : 'Mitarbeiter bearbeiten'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="px-6 py-12 text-center text-sm text-gray-400">Wird geladen…</div>
        ) : user ? (
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
                <input type="text" name="name" defaultValue={user.name} required className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">E-Mail</label>
                <input type="email" name="email" defaultValue={user.email} required className={inputClass} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-gray-700">Neues Passwort (leer = unverändert)</label>
                {isSuperAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      const pw = generatePassword()
                      if (passwordRef.current) {
                        passwordRef.current.value = pw
                        passwordRef.current.type = 'text'
                        setShowPassword(true)
                      }
                    }}
                    className="text-[11px] font-medium text-indigo-600 hover:text-indigo-800 transition"
                  >
                    Generieren
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  ref={passwordRef}
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder="••••••••"
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Rolle</label>
              <select name="role" defaultValue={user.role} className={selectClass}>
                <option value="EMPLOYEE">Mitarbeiter</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Primärer Standort</label>
              <select name="locationId" defaultValue={user.primaryLocationId || ''} className={selectClass}>
                <option value="">Beide Standorte</option>
                {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-gray-700">Vergütung</label>
                <div className="flex gap-1 rounded-lg border border-gray-200 p-0.5 bg-gray-50">
                  {(['hourly', 'monthly'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setSalaryType(t)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${salaryType === t ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      {t === 'hourly' ? 'Stundenlohn' : 'Monatslohn'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {salaryType === 'hourly' ? (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Stundenlohn (€)</label>
                    <input type="number" name="hourlyRate" step="0.01" defaultValue={user.hourlyRate} className={inputClass} />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Monatslohn (€)</label>
                    <input type="number" name="monthlyRate" step="1" defaultValue={user.monthlyRate ?? ''} placeholder="z.B. 2200" className={inputClass} />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Nebenkosten (%)</label>
                  <input type="number" name="overheadPercent" step="0.1" defaultValue={user.overheadPercent} className={inputClass} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Max. Std./Woche</label>
                <input type="number" name="maxHoursWeek" step="0.5" defaultValue={user.maxHoursWeek ?? ''} placeholder="z.B. 40" className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Max. Std./Monat</label>
                <input type="number" name="maxHoursMonth" step="0.5" defaultValue={user.maxHoursMonth ?? ''} placeholder="z.B. 168" className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Urlaubstage/Jahr</label>
                <input type="number" name="vacationDaysPerYear" step="1" defaultValue={user.vacationDaysPerYear} placeholder="z.B. 24" className={inputClass} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Eintrittsdatum</label>
                <input type="date" name="startDate" defaultValue={toDateInput(user.startDate)} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Austrittsdatum (optional)</label>
                <input type="date" name="endDate" defaultValue={toDateInput(user.endDate)} className={inputClass} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Geburtstag</label>
                <input type="date" name="birthday" defaultValue={toDateInput(user.birthday)} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Handynummer</label>
                <input type="text" name="phone" defaultValue={user.phone ?? ''} placeholder="z.B. 0176 12345678" className={inputClass} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Adresse</label>
              <input type="text" name="address" defaultValue={user.address ?? ''} placeholder="Straße, PLZ Ort" className={inputClass} />
            </div>

            {error && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 px-4 border border-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 transition active:scale-[0.97]"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-2 px-4 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition active:scale-[0.97]"
              >
                {saving ? 'Wird gespeichert…' : 'Speichern'}
              </button>
            </div>
          </form>
        ) : null}
      </div>
    </div>
  )
}
