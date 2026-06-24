'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { updatePersonalbogen } from '@/app/actions/employees'

export type PersonalbogenUser = {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  street: string | null
  postalCode: string | null
  city: string | null
  nationality: string | null
  birthday: string | null
  birthName: string | null
  birthPlace: string | null
  gender: string | null
  taxId: string | null
  socialSecurityNo: string | null
  iban: string | null
  healthInsurance: string | null
  phone: string | null
  personnelNumber: string | null
  entryDate: string | null
  exitDate: string | null
  jobTitle: string | null
  weeklyWorkTime: string | null
  grossSalary: string | null
  additionalSalaryComponents: string | null
  specialPayments: string | null
  payrollType: string | null
  shortTermLimit: string | null
  voluntaryInternship: boolean
  shareholderPercent: string | null
  otherEmployment: string[]
  vacationDaysAnnual: number | null
  vacationDaysProRata: number | null
}

const labelClass = 'block text-xs font-medium text-gray-500 mb-1.5'
const inputClass =
  'w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'

function Txt({ label, name, def, type = 'text', placeholder, hint, full }: {
  label: string; name: string; def?: string | null; type?: string; placeholder?: string; hint?: string; full?: boolean
}) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <label htmlFor={name} className={labelClass}>{label}</label>
      <input id={name} name={name} type={type} defaultValue={def ?? ''} placeholder={placeholder} className={inputClass} />
      {hint && <p className="text-[11px] text-gray-400 mt-1">{hint}</p>}
    </div>
  )
}

// Abgeleitetes, nicht editierbares Feld (Wert kommt aus den Stammdaten → kein eigenes Input,
// wird daher auch nicht mitgespeichert).
function Derived({ label, value, hint, full }: {
  label: string; value?: string | null; hint?: string; full?: boolean
}) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <label className={labelClass}>{label}</label>
      <div className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-700">
        {value || <span className="text-gray-400">– aus Stammdaten –</span>}
      </div>
      {hint && <p className="text-[11px] text-gray-400 mt-1">{hint}</p>}
    </div>
  )
}

function Sel({ label, name, def, options }: {
  label: string; name: string; def?: string | null; options: { v: string; l: string }[]
}) {
  return (
    <div>
      <label htmlFor={name} className={labelClass}>{label}</label>
      <select id={name} name={name} defaultValue={def ?? ''} className={inputClass}>
        <option value="">– keine Angabe –</option>
        {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </div>
  )
}

function MultiSel({ label, name, def, options }: {
  label: string; name: string; def: string[]; options: { v: string; l: string }[]
}) {
  return (
    <div className="sm:col-span-2">
      <span className={labelClass}>{label}</span>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {options.map((o) => (
          <label key={o.v} className="flex items-center gap-2.5 text-sm text-gray-700">
            <input type="checkbox" name={name} value={o.v} defaultChecked={def.includes(o.v)}
              className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
            {o.l}
          </label>
        ))}
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 sm:p-6">
      <h2 className="text-sm font-semibold text-gray-900 mb-4">{title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
    </div>
  )
}

const PAYROLL_OPTIONS = [
  { v: 'SV_PFLICHTIG', l: 'Sozialversicherungspflichtig' },
  { v: 'AUSZUBILDENDER', l: 'Auszubildender' },
  { v: 'MINIJOBBER', l: 'Minijobber' },
  { v: 'WERKSTUDENT', l: 'Werkstudent' },
  { v: 'KURZFRISTIG', l: 'Kurzfristige Beschäftigung' },
  { v: 'PFLICHTPRAKTIKUM', l: 'Pflichtpraktikum' },
  { v: 'GESCHAEFTSFUEHRER', l: 'Geschäftsführer' },
  { v: 'SONSTIGES', l: 'Sonstiges' },
]
const OTHER_OPTIONS = [
  { v: 'NEIN', l: 'Nein' },
  { v: 'JA_SV_PFLICHTIG', l: 'Ja, Sv-Pflichtig' },
  { v: 'JA_MINIJOB', l: 'Ja, Minijob' },
  { v: 'JA_KURZFRISTIG', l: 'Ja, kurzfristige Beschäftigung' },
  { v: 'JA_SELBSTSTAENDIG', l: 'Ja, Selbstständigkeit' },
]

type FormState = { error?: string; saved?: boolean }

export default function PersonalbogenForm({ user }: { user: PersonalbogenUser }) {
  const action = updatePersonalbogen.bind(null, user.id)
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    async (_prev, formData) => {
      const res = await action(formData)
      return res.error ? { error: res.error } : { saved: true }
    },
    {},
  )

  return (
    <form action={formAction} className="space-y-5 max-w-3xl">
      <Section title="Persönliche HR-Daten">
        <p className="sm:col-span-2 text-xs text-gray-400 -mt-1">
          Name, Adresse, Geburtstag, Telefon und E-Mail werden in den Stammdaten gepflegt.
        </p>
        <Sel label="Geschlecht" name="gender" def={user.gender} options={[
          { v: 'MALE', l: 'männlich' }, { v: 'FEMALE', l: 'weiblich' }, { v: 'DIVERSE', l: 'divers' },
        ]} />
        <Txt label="Staatsangehörigkeit" name="nationality" def={user.nationality} />
        <Txt label="Geburtsname (falls abweichend)" name="birthName" def={user.birthName} />
        <Txt label="Geburtsort und Land" name="birthPlace" def={user.birthPlace} />
        <Txt label="Steuer-Identifikationsnummer" name="taxId" def={user.taxId} hint="11-stellig" />
        <Txt label="Sozialversicherungs-Nr." name="socialSecurityNo" def={user.socialSecurityNo} hint="12-stellig" />
        <Txt label="Bankverbindung / IBAN" name="iban" def={user.iban} />
        <Txt label="Krankenkasse" name="healthInsurance" def={user.healthInsurance} />
      </Section>

      <Section title="Angaben zur Beschäftigung">
        <Txt label="Personalnummer" name="personnelNumber" def={user.personnelNumber} />
        <Txt label="Genaue Tätigkeitsbezeichnung" name="jobTitle" def={user.jobTitle} />
        <Derived label="Wochenarbeitszeit" value={user.weeklyWorkTime} hint="ergibt sich aus Max. Std./Woche (Stammdaten)" full />
        <Derived label="Brutto-Verdienst" value={user.grossSalary} hint="ergibt sich aus Stundenlohn/Monatslohn (Stammdaten)" full />
        <Txt label="Sonstige Gehaltsbestandteile (VWL/Firmenwagen etc.)" name="additionalSalaryComponents" def={user.additionalSalaryComponents} full />
        <Txt label="Vertraglich festgelegte Sonderzahlungen (Weihnachts-/Urlaubsgeld / Boni)" name="specialPayments" def={user.specialPayments} full />
        <Sel label="Abrechnungs-Art" name="payrollType" def={user.payrollType} options={PAYROLL_OPTIONS} />
        <Sel label="Kurzfristig – Grenze" name="shortTermLimit" def={user.shortTermLimit} options={[
          { v: '3 Monate', l: '3 Monate' }, { v: '70 Tage', l: '70 Tage' },
        ]} />
        <Txt label="Gesellschaftsanteile in % (bei Geschäftsführer)" name="shareholderPercent" def={user.shareholderPercent} />
        <MultiSel label="Werden weitere Beschäftigungen ausgeübt? (Mehrfachauswahl)" name="otherEmployment" def={user.otherEmployment} options={OTHER_OPTIONS} />
        <Txt label="Urlaubsanspruch lfd. Jahr / anteilig (Tage)" name="vacationDaysProRata" def={user.vacationDaysProRata?.toString() ?? ''} type="number" />
        <label className="sm:col-span-2 flex items-center gap-2.5 text-sm text-gray-700">
          <input type="checkbox" name="voluntaryInternship" defaultChecked={user.voluntaryInternship} className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
          Freiwilliges Praktikum
        </label>
      </Section>

      {state.error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{state.error}</p>}
      {state.saved && <p className="text-sm text-green-600 bg-green-50 rounded-lg px-3 py-2">Gespeichert ✓</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="py-2.5 px-5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition active:scale-[0.98]"
        >
          {pending ? 'Speichern …' : 'Personalbogen speichern'}
        </button>
        <Link href="/admin/employees" className="text-sm text-gray-500 hover:text-gray-900">Zur Übersicht</Link>
      </div>
    </form>
  )
}
