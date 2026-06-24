'use client'

import { useActionState, useState } from 'react'
import { IconCheck, IconChevronDown, IconX, IconPlus } from '@tabler/icons-react'
import { upsertInsight } from '@/app/actions/insights'
import {
  MAX_NOTE_LENGTH,
  MAX_SUPERPOWERS,
  PERSONALITY_KEYS,
  PERSONALITY_META,
  type PersonalityValue,
} from '@/lib/insights'

export type InsightFormData = {
  id: string
  name: string
  personalityType: PersonalityValue
  personalityNote: string | null
  superpowers: string[]
  observations: string | null
}

const labelClass = 'block text-xs font-medium text-gray-500 mb-1.5'
const inputClass =
  'w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'

type FormState = { error?: string; saved?: boolean }

export default function InsightForm({ member }: { member: InsightFormData }) {
  const action = upsertInsight.bind(null, member.id)
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    async (_prev, formData) => {
      const res = await action(formData)
      return res.error ? { error: res.error } : { saved: true }
    },
    {},
  )

  const [type, setType] = useState<PersonalityValue>(member.personalityType)
  const [note, setNote] = useState(member.personalityNote ?? '')
  const [powers, setPowers] = useState<string[]>(member.superpowers)
  const [draft, setDraft] = useState('')
  const [obsOpen, setObsOpen] = useState(!!member.observations)

  function addPower(value: string) {
    const v = value.trim()
    if (!v) return
    if (powers.length >= MAX_SUPERPOWERS) return
    if (powers.some((p) => p.toLowerCase() === v.toLowerCase())) {
      setDraft('')
      return
    }
    setPowers([...powers, v])
    setDraft('')
  }

  function onDraftKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addPower(draft)
    } else if (e.key === 'Backspace' && !draft && powers.length) {
      setPowers(powers.slice(0, -1))
    }
  }

  return (
    <form action={formAction} className="space-y-5 max-w-2xl">
      {/* Persönlichkeitstyp */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 sm:p-6">
        <h2 className="text-sm font-semibold text-gray-900">Persönlichkeitstyp</h2>
        <p className="text-xs text-gray-500 mt-1 mb-4">
          Merrill-Reid-Modell. Kein Typ ist besser – ein gutes Team braucht alle vier.
        </p>
        <input type="hidden" name="personalityType" value={type} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {PERSONALITY_KEYS.map((key) => {
            const m = PERSONALITY_META[key]
            const active = type === key
            return (
              <button
                type="button"
                key={key}
                onClick={() => setType(key)}
                className={`text-left rounded-xl border p-3 transition active:scale-[0.99] ${
                  active
                    ? 'border-transparent ring-2 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                style={active ? { boxShadow: `0 0 0 2px ${m.color}`, borderColor: m.color } : undefined}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: m.color }} />
                  <span className="text-sm font-semibold text-gray-900">{m.label}</span>
                  {active && <IconCheck size={15} className="ml-auto text-gray-500" stroke={2} />}
                </div>
                <p className="text-[11px] text-gray-500 mt-1 leading-snug">{m.tagline}</p>
              </button>
            )
          })}
        </div>
        <button
          type="button"
          onClick={() => setType('UNKNOWN')}
          className={`mt-2.5 text-xs px-3 py-1.5 rounded-lg border transition ${
            type === 'UNKNOWN'
              ? 'border-gray-400 bg-gray-50 text-gray-700'
              : 'border-gray-200 text-gray-500 hover:bg-gray-50'
          }`}
        >
          Noch unbekannt / nicht festlegen
        </button>

        <div className="mt-4">
          <label htmlFor="personalityNote" className={labelClass}>
            Tendenz / Mischtyp-Notiz
          </label>
          <input
            id="personalityNote"
            name="personalityNote"
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, MAX_NOTE_LENGTH))}
            maxLength={MAX_NOTE_LENGTH}
            placeholder={'z. B. „Driver mit starker Analytic-Ader"'}
            className={inputClass}
          />
          <p className="text-[11px] text-gray-400 mt-1 text-right">
            {note.length}/{MAX_NOTE_LENGTH}
          </p>
        </div>
      </div>

      {/* Superpowers */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 sm:p-6">
        <h2 className="text-sm font-semibold text-gray-900">Superpowers</h2>
        <p className="text-xs text-gray-500 mt-1 mb-3">
          Individuelle Stärken – makro, mikro, ernst, silly. Bis zu {MAX_SUPERPOWERS} Einträge.
        </p>
        {powers.map((p) => (
          <input key={p} type="hidden" name="superpowers" value={p} />
        ))}
        <div className="flex flex-wrap gap-1.5 mb-2">
          {powers.map((p, i) => (
            <span
              key={p}
              className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-medium ring-1 ring-indigo-100"
            >
              {p}
              <button
                type="button"
                onClick={() => setPowers(powers.filter((_, j) => j !== i))}
                className="rounded-full hover:bg-indigo-100 p-0.5 transition"
                aria-label={`${p} entfernen`}
              >
                <IconX size={12} stroke={2.5} />
              </button>
            </span>
          ))}
          {powers.length === 0 && (
            <span className="text-xs text-gray-400 py-1">Noch keine Superpowers erfasst.</span>
          )}
        </div>
        {powers.length < MAX_SUPERPOWERS && (
          <div className="flex gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onDraftKey}
              placeholder="Stärke eingeben, Enter zum Hinzufügen"
              className={inputClass}
            />
            <button
              type="button"
              onClick={() => addPower(draft)}
              className="shrink-0 px-3 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
              aria-label="Hinzufügen"
            >
              <IconPlus size={16} stroke={2} />
            </button>
          </div>
        )}
      </div>

      {/* Beobachtungen (kollabiert) */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 sm:p-6">
        <button
          type="button"
          onClick={() => setObsOpen((v) => !v)}
          className="flex w-full items-center justify-between text-left"
        >
          <span className="text-sm font-semibold text-gray-900">Beobachtungen (optional)</span>
          <IconChevronDown
            size={18}
            className={`text-gray-400 transition-transform ${obsOpen ? 'rotate-180' : ''}`}
          />
        </button>
        {obsOpen && (
          <textarea
            name="observations"
            defaultValue={member.observations ?? ''}
            rows={4}
            placeholder="Freie Notizen, Kontext, was beim Delegieren hilft …"
            className={`${inputClass} mt-3 resize-y`}
          />
        )}
        {!obsOpen && <input type="hidden" name="observations" value={member.observations ?? ''} />}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="px-4 py-2.5 text-sm font-medium rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition disabled:opacity-60"
        >
          {pending ? 'Speichern …' : 'Einschätzung speichern'}
        </button>
        {state.saved && !pending && (
          <span className="inline-flex items-center gap-1 text-sm text-emerald-600">
            <IconCheck size={16} stroke={2.5} /> Gespeichert
          </span>
        )}
        {state.error && <span className="text-sm text-red-600">{state.error}</span>}
      </div>
    </form>
  )
}
