'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { createEmployee } from '@/app/actions/employees'
import AvailabilityFields from './AvailabilityFields'

type Location = { id: string; name: string }

const inputClass =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
const selectClass =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white'

export default function NewEmployeeForm({ locations }: { locations: Location[] }) {
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [salaryType, setSalaryType] = useState<'hourly' | 'monthly'>('hourly')

  function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await createEmployee(formData)
      if (result.error) {
        setError(result.error)
      } else if (result.inviteToken) {
        setInviteLink(`${window.location.origin}/onboarding/${result.inviteToken}`)
      }
    })
  }

  if (inviteLink) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
            <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span className="text-sm font-medium text-gray-900">Mitarbeiter wurde angelegt.</span>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-2">
            Schicke diesen Einladungslink an den Mitarbeiter. Der Link ist 7 Tage gültig.
          </p>
          <div className="flex gap-2">
            <input
              readOnly
              value={inviteLink}
              className="flex-1 px-3 py-2 text-xs border border-gray-300 rounded-lg bg-gray-50 font-mono"
            />
            <button
              onClick={() => {
                navigator.clipboard.writeText(inviteLink)
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
              }}
              className="px-3 py-2 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition active:scale-[0.97] whitespace-nowrap"
            >
              {copied ? 'Kopiert!' : 'Kopieren'}
            </button>
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button
            onClick={() => { setInviteLink(null); setCopied(false) }}
            className="flex-1 py-2 px-4 border border-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 text-center transition active:scale-[0.97]"
          >
            Weiteren MA anlegen
          </button>
          <Link
            href="/admin/employees"
            className="flex-1 py-2 px-4 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition active:scale-[0.97] text-center"
          >
            Zur Mitarbeiterliste
          </Link>
        </div>
      </div>
    )
  }

  return (
    <form action={handleSubmit} className="space-y-4 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <input type="hidden" name="salaryType" value={salaryType} />

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
          <input type="text" name="name" required className={inputClass} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">E-Mail</label>
          <input type="email" name="email" required className={inputClass} />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Rolle</label>
        <select name="role" defaultValue="EMPLOYEE" className={selectClass}>
          <option value="EMPLOYEE">Mitarbeiter</option>
          <option value="ADMIN">Admin</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Primärer Standort</label>
        <select name="locationId" defaultValue="" className={selectClass}>
          <option value="">Beide Standorte</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-gray-700">Vergütung</label>
          <div className="flex gap-1 rounded-lg border border-gray-200 p-0.5 bg-gray-50">
            <button
              type="button"
              onClick={() => setSalaryType('hourly')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${salaryType === 'hourly' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Stundenlohn
            </button>
            <button
              type="button"
              onClick={() => setSalaryType('monthly')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${salaryType === 'monthly' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Monatslohn
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {salaryType === 'hourly' ? (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Stundenlohn (€)</label>
              <input type="number" name="hourlyRate" step="0.01" defaultValue="0" className={inputClass} />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Monatslohn (€)</label>
              <input type="number" name="monthlyRate" step="1" placeholder="z.B. 2200" className={inputClass} />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Nebenkosten (%)</label>
            <input type="number" name="overheadPercent" step="0.1" defaultValue="0" className={inputClass} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Max. Std./Woche</label>
          <input type="number" name="maxHoursWeek" step="0.5" placeholder="z.B. 40" className={inputClass} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Max. Std./Monat</label>
          <input type="number" name="maxHoursMonth" step="0.5" placeholder="z.B. 168" className={inputClass} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Eintrittsdatum</label>
          <input type="date" name="startDate" className={inputClass} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Austrittsdatum (optional)</label>
          <input type="date" name="endDate" className={inputClass} />
        </div>
      </div>

      <AvailabilityFields />

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="flex gap-3 pt-2">
        <Link
          href="/admin/employees"
          className="flex-1 py-2 px-4 border border-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 text-center transition active:scale-[0.97]"
        >
          Abbrechen
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 py-2 px-4 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition active:scale-[0.97]"
        >
          {isPending ? 'Wird angelegt...' : 'Einladung erstellen'}
        </button>
      </div>
    </form>
  )
}
