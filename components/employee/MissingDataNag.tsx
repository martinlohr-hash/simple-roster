'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { saveDeferredData } from '@/app/actions/profile'

export type DeferredField = 'taxId' | 'socialSecurityNo' | 'iban'

const FIELD_META: Record<DeferredField, { label: string; hint?: string; placeholder?: string; inputMode?: 'numeric' | 'text' }> = {
  taxId: { label: 'Persönliche Steuer-Identifikationsnummer', hint: '11-stellig', placeholder: '12 345 678 901', inputMode: 'numeric' },
  socialSecurityNo: { label: 'Sozialversicherungs-Nr.', hint: '12-stellig', placeholder: '65 170839 J 003' },
  iban: { label: 'Bankverbindung / IBAN', placeholder: 'DE..' },
}

const SNOOZE_MS = 24 * 60 * 60 * 1000 // 24 h

export default function MissingDataNag({ userId, missing }: { userId: string; missing: DeferredField[] }) {
  const router = useRouter()
  const [visible, setVisible] = useState(false)
  const [values, setValues] = useState<Record<string, string>>({})
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const key = `roster_datanag_${userId}`

  useEffect(() => {
    if (missing.length === 0) return
    // Nicht gleichzeitig mit dem Willkommens-Modal aufpoppen – erst danach.
    if (!localStorage.getItem(`roster_welcome_${userId}`)) return
    const snoozedAt = Number(localStorage.getItem(key) || 0)
    // localStorage ist nur clientseitig verfügbar → Sichtbarkeit muss im Effekt gesetzt werden.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (Date.now() - snoozedAt > SNOOZE_MS) setVisible(true)
  }, [key, missing.length, userId])

  if (!visible || missing.length === 0) return null

  function snooze() {
    localStorage.setItem(key, String(Date.now()))
    setVisible(false)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setPending(true)
    ;(async () => {
      const res = await saveDeferredData({
        taxId: values.taxId,
        socialSecurityNo: values.socialSecurityNo,
        iban: values.iban,
      })
      setPending(false)
      if (res?.error) {
        setError(res.error)
        return
      }
      // Auch bei nur teilweisem Ausfüllen 24 h Ruhe geben; falls noch etwas fehlt,
      // erscheint der Hinweis später erneut.
      localStorage.setItem(key, String(Date.now()))
      setVisible(false)
      router.refresh()
    })()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
        <div className="bg-indigo-600 px-6 pt-6 pb-5 text-white text-center">
          <div className="text-3xl mb-2">📋</div>
          <h2 className="text-base font-bold">Noch ein paar Angaben fehlen</h2>
          <p className="text-indigo-200 text-sm mt-1 leading-relaxed">
            Für die Abrechnung brauchen wir diese Daten. Du kannst sie jetzt eintragen oder später nachreichen.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {missing.map((field) => {
            const meta = FIELD_META[field]
            return (
              <div key={field}>
                <label htmlFor={`nag-${field}`} className="block text-sm font-medium text-gray-700 mb-1.5">
                  {meta.label}
                </label>
                <input
                  id={`nag-${field}`}
                  inputMode={meta.inputMode}
                  value={values[field] || ''}
                  onChange={(e) => setValues((v) => ({ ...v, [field]: e.target.value }))}
                  placeholder={meta.placeholder}
                  className="w-full min-h-11 px-3.5 py-2.5 rounded-xl border border-gray-500 bg-white text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {meta.hint && <p className="text-[11px] text-gray-500 mt-1">{meta.hint}</p>}
              </div>
            )
          })}

          {error && <p role="alert" className="text-sm text-red-800 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <button
            type="submit"
            disabled={pending}
            className="w-full py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition active:scale-[0.98]"
          >
            {pending ? 'Speichern …' : 'Speichern'}
          </button>
          <button
            type="button"
            onClick={snooze}
            className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition"
          >
            Später erinnern
          </button>
        </form>
      </div>
    </div>
  )
}
