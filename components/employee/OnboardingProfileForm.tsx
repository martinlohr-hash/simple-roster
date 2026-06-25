'use client'

import { useState, useTransition } from 'react'
import { completeMyProfile } from '@/app/actions/profile'

type Initial = {
  firstName: string
  lastName: string
  street: string
  postalCode: string
  city: string
  nationality: string
  birthday: string
  birthName: string
  birthPlace: string
  gender: string
  taxId: string
  socialSecurityNo: string
  iban: string
  healthInsurance: string
  phone: string
}

const inputClass =
  'w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'

function Field({
  label,
  name,
  value,
  onChange,
  type = 'text',
  required = false,
  placeholder,
  hint,
  inputMode,
}: {
  label: string
  name: string
  value: string
  onChange: (v: string) => void
  type?: string
  required?: boolean
  placeholder?: string
  hint?: string
  inputMode?: 'text' | 'numeric'
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-xs font-medium text-gray-500 mb-1.5">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        className={inputClass}
      />
      {hint && <p className="text-[11px] text-gray-400 mt-1">{hint}</p>}
    </div>
  )
}

export default function OnboardingProfileForm({ initial }: { initial: Initial }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [f, setF] = useState<Initial>(initial)
  const set = (key: keyof Initial) => (v: string) => setF((prev) => ({ ...prev, [key]: v }))

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    startTransition(async () => {
      // Bei Erfolg leitet die Server-Action per redirect weiter (kein Rückgabewert).
      const result = await completeMyProfile(f)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Vorname" name="firstName" value={f.firstName} onChange={set('firstName')} required />
        <Field label="Name" name="lastName" value={f.lastName} onChange={set('lastName')} required />
      </div>

      <Field label="Straße und Hausnummer" name="street" value={f.street} onChange={set('street')} required />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Field label="PLZ" name="postalCode" value={f.postalCode} onChange={set('postalCode')} required inputMode="numeric" />
        <div className="sm:col-span-2">
          <Field label="Ort" name="city" value={f.city} onChange={set('city')} required />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Staatsangehörigkeit" name="nationality" value={f.nationality} onChange={set('nationality')} required />
        <Field label="Geburtsdatum" name="birthday" type="date" value={f.birthday} onChange={set('birthday')} required />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Geburtsname (falls abweichend)" name="birthName" value={f.birthName} onChange={set('birthName')} />
        <Field label="Geburtsort und Land" name="birthPlace" value={f.birthPlace} onChange={set('birthPlace')} required />
      </div>

      <div>
        <span className="block text-xs font-medium text-gray-500 mb-1.5">Geschlecht <span className="text-red-400">*</span></span>
        <div className="flex gap-2">
          {[
            { v: 'MALE', l: 'männlich' },
            { v: 'FEMALE', l: 'weiblich' },
            { v: 'DIVERSE', l: 'divers' },
          ].map((opt) => (
            <label
              key={opt.v}
              className={`flex-1 cursor-pointer text-center text-sm py-2.5 rounded-xl border transition ${
                f.gender === opt.v
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-medium'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <input
                type="radio"
                name="gender"
                value={opt.v}
                checked={f.gender === opt.v}
                onChange={() => set('gender')(opt.v)}
                required
                className="sr-only"
              />
              {opt.l}
            </label>
          ))}
        </div>
      </div>

      <Field label="Krankenkasse" name="healthInsurance" value={f.healthInsurance} onChange={set('healthInsurance')} required />
      <Field label="Telefon" name="phone" type="tel" value={f.phone} onChange={set('phone')} placeholder="+49 …" />

      <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/60 p-4 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-700">Kannst du auch später nachreichen</h3>
          <p className="text-[11px] text-gray-400 mt-0.5">
            Diese Angaben brauchen wir für die Abrechnung. Hast du sie nicht zur Hand, lass sie einfach leer –
            du kommst trotzdem direkt rein und wirst später kurz daran erinnert.
          </p>
        </div>
        <Field
          label="Persönliche Steuer-Identifikationsnummer"
          name="taxId"
          value={f.taxId}
          onChange={set('taxId')}
          inputMode="numeric"
          hint="11-stellig"
          placeholder="12 345 678 901"
        />
        <Field
          label="Sozialversicherungs-Nr."
          name="socialSecurityNo"
          value={f.socialSecurityNo}
          onChange={set('socialSecurityNo')}
          hint="12-stellig"
          placeholder="65 170839 J 003"
        />
        <Field label="Bankverbindung / IBAN" name="iban" value={f.iban} onChange={set('iban')} placeholder="DE.." />
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="w-full py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition active:scale-[0.98]"
      >
        {isPending ? 'Speichern …' : 'Daten speichern & loslegen'}
      </button>
      <p className="text-center text-[11px] text-gray-400">* Pflichtfeld</p>
    </form>
  )
}
