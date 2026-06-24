'use client'

import { useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import AvailabilityFields from './AvailabilityFields'

type Location = { id: string; name: string }
type Defaults = {
  firstName?: string | null; lastName?: string | null; email?: string; role?: string
  hourlyRate?: number; monthlyRate?: number | null; overheadPercent?: number
  maxHoursWeek?: number | null; maxHoursMonth?: number | null
  vacationDaysPerYear?: number
  primaryLocationId?: string | null
  startDate?: Date | string | null; endDate?: Date | string | null
  phone?: string | null; birthday?: Date | string | null
  street?: string | null; postalCode?: string | null; city?: string | null
  unavailableDays?: number[]; preferredDays?: number[]
  earliestStart?: string | null; latestEnd?: string | null
}

type Props = {
  action: (formData: FormData) => Promise<void>
  locations: Location[]
  defaults?: Defaults
}

function toDateInput(val?: Date | string | null): string {
  if (!val) return ''
  const d = typeof val === 'string' ? new Date(val) : val
  return format(d, 'yyyy-MM-dd')
}

export default function EmployeeForm({ action, locations, defaults }: Props) {
  const [showPassword, setShowPassword] = useState(false)
  const initialSalaryType = defaults?.monthlyRate != null && defaults.monthlyRate > 0 ? 'monthly' : 'hourly'
  const [salaryType, setSalaryType] = useState<'hourly' | 'monthly'>(initialSalaryType)

  return (
    <form action={action} className="space-y-4 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <input type="hidden" name="salaryType" value={salaryType} />

      <div className="grid grid-cols-2 gap-4">
        <Field label="Vorname" name="firstName" defaultValue={defaults?.firstName ?? ''} />
        <Field label="Nachname" name="lastName" defaultValue={defaults?.lastName ?? ''} />
      </div>
      <Field label="E-Mail" name="email" type="email" defaultValue={defaults?.email} required />

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          {defaults ? 'Neues Passwort (leer lassen = unverändert)' : 'Passwort'}
        </label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            name="password"
            required={!defaults}
            placeholder={defaults ? '••••••••' : undefined}
            className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            tabIndex={-1}
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
        <select name="role" defaultValue={defaults?.role || 'EMPLOYEE'} className={selectClass}>
          <option value="EMPLOYEE">Mitarbeiter</option>
          <option value="ADMIN">Admin</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Primärer Standort</label>
        <select name="locationId" defaultValue={defaults?.primaryLocationId || ''} className={selectClass}>
          <option value="">Beide Standorte</option>
          {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
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
            <Field label="Stundenlohn (€)" name="hourlyRate" type="number" step="0.01"
              defaultValue={String(defaults?.hourlyRate ?? 0)} />
          ) : (
            <Field label="Monatslohn (€)" name="monthlyRate" type="number" step="1"
              defaultValue={String(defaults?.monthlyRate ?? '')} placeholder="z.B. 2200" />
          )}
          <Field label="Nebenkosten (%)" name="overheadPercent" type="number" step="0.1"
            defaultValue={String(defaults?.overheadPercent ?? 0)} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Field label="Max. Std./Woche" name="maxHoursWeek" type="number" step="0.5"
          defaultValue={defaults?.maxHoursWeek != null ? String(defaults.maxHoursWeek) : ''}
          placeholder="z.B. 40" />
        <Field label="Max. Std./Monat" name="maxHoursMonth" type="number" step="0.5"
          defaultValue={defaults?.maxHoursMonth != null ? String(defaults.maxHoursMonth) : ''}
          placeholder="z.B. 168" />
        <Field label="Urlaubstage/Jahr" name="vacationDaysPerYear" type="number" step="1"
          defaultValue={String(defaults?.vacationDaysPerYear ?? 0)}
          placeholder="z.B. 24" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Eintrittsdatum" name="startDate" type="date"
          defaultValue={toDateInput(defaults?.startDate)} />
        <Field label="Austrittsdatum (optional)" name="endDate" type="date"
          defaultValue={toDateInput(defaults?.endDate)} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Geburtstag" name="birthday" type="date"
          defaultValue={toDateInput(defaults?.birthday)} />
        <Field label="Handynummer" name="phone" defaultValue={defaults?.phone ?? ''} placeholder="z.B. 0176 12345678" />
      </div>

      <Field label="Straße und Hausnummer" name="street" defaultValue={defaults?.street ?? ''} placeholder="z.B. Isestraße 85" />
      <div className="grid grid-cols-2 gap-4">
        <Field label="PLZ" name="postalCode" defaultValue={defaults?.postalCode ?? ''} placeholder="z.B. 20149" />
        <Field label="Ort" name="city" defaultValue={defaults?.city ?? ''} placeholder="z.B. Hamburg" />
      </div>

      <AvailabilityFields
        unavailableDays={defaults?.unavailableDays}
        preferredDays={defaults?.preferredDays}
        earliestStart={defaults?.earliestStart}
        latestEnd={defaults?.latestEnd}
      />

      <div className="flex gap-3 pt-2">
        <Link href="/admin/employees" className="flex-1 py-2 px-4 border border-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 text-center transition active:scale-[0.97]">
          Abbrechen
        </Link>
        <button type="submit" className="flex-1 py-2 px-4 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition active:scale-[0.97]">
          Speichern
        </button>
      </div>
    </form>
  )
}

const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
const selectClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white'

function Field({ label, name, type = 'text', defaultValue, required, placeholder, step }: {
  label: string; name: string; type?: string; defaultValue?: string
  required?: boolean; placeholder?: string; step?: string
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type} name={name} defaultValue={defaultValue} required={required}
        placeholder={placeholder} step={step}
        className={inputClass}
      />
    </div>
  )
}
