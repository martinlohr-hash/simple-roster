'use client'

import Link from 'next/link'

type Location = { id: string; name: string }
type Defaults = {
  name?: string; email?: string; role?: string
  hourlyRate?: number; overheadPercent?: number
  maxHoursWeek?: number | null; maxHoursMonth?: number | null
  primaryLocationId?: string | null
}

type Props = {
  action: (formData: FormData) => Promise<void>
  locations: Location[]
  defaults?: Defaults
}

export default function EmployeeForm({ action, locations, defaults }: Props) {
  return (
    <form action={action} className="space-y-4 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Name" name="name" defaultValue={defaults?.name} required />
        <Field label="E-Mail" name="email" type="email" defaultValue={defaults?.email} required />
      </div>

      <Field
        label={defaults ? 'Neues Passwort (leer lassen = unverändert)' : 'Passwort'}
        name="password"
        type="password"
        required={!defaults}
        placeholder={defaults ? '••••••••' : undefined}
      />

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

      <div className="grid grid-cols-2 gap-4">
        <Field label="Stundenlohn (€)" name="hourlyRate" type="number" step="0.01" defaultValue={String(defaults?.hourlyRate ?? 0)} />
        <Field label="Nebenkosten (%)" name="overheadPercent" type="number" step="0.1" defaultValue={String(defaults?.overheadPercent ?? 0)} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Max. Std./Woche" name="maxHoursWeek" type="number" step="0.5" defaultValue={defaults?.maxHoursWeek != null ? String(defaults.maxHoursWeek) : ''} placeholder="z.B. 40" />
        <Field label="Max. Std./Monat" name="maxHoursMonth" type="number" step="0.5" defaultValue={defaults?.maxHoursMonth != null ? String(defaults.maxHoursMonth) : ''} placeholder="z.B. 168" />
      </div>

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
