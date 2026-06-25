'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createStep, updateStep, deleteStep, toggleStep, sendTestStep } from '@/app/actions/onboarding-admin'

type Step = {
  id: string
  order: number
  delayDays: number
  subject: string
  body: string
  ctaLabel: string | null
  ctaUrl: string | null
  active: boolean
}

const EMPTY: Omit<Step, 'id'> = {
  order: 0,
  delayDays: 0,
  subject: '',
  body: '',
  ctaLabel: '',
  ctaUrl: '',
  active: true,
}

function dayLabel(d: number): string {
  return d <= 0 ? 'Sofort (Tag 0)' : `Tag ${d}`
}

export default function OnboardingManager({ initialSteps }: { initialSteps: Step[] }) {
  const router = useRouter()
  const [editing, setEditing] = useState<Step | 'new' | null>(null)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  function refresh() {
    router.refresh()
  }

  function handleSave(form: HTMLFormElement, id: string | null) {
    setError(null)
    const fd = new FormData(form)
    startTransition(async () => {
      const res = id ? await updateStep(id, fd) : await createStep(fd)
      if (res?.error) {
        setError(res.error)
        return
      }
      setEditing(null)
      refresh()
    })
  }

  function handleDelete(id: string) {
    if (!confirm('Diese Stufe wirklich löschen?')) return
    startTransition(async () => {
      await deleteStep(id)
      refresh()
    })
  }

  function handleToggle(s: Step) {
    startTransition(async () => {
      await toggleStep(s.id, !s.active)
      refresh()
    })
  }

  function handleTest(s: Step) {
    setError(null)
    setNotice(null)
    startTransition(async () => {
      const res = await sendTestStep(s.id)
      if (res?.error) setError(res.error)
      else setNotice('Testmail an deine Adresse verschickt.')
    })
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{error}</div>
      )}
      {notice && (
        <div className="rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm px-3 py-2">{notice}</div>
      )}

      {editing === 'new' && (
        <StepForm
          step={null}
          pending={pending}
          onCancel={() => setEditing(null)}
          onSubmit={(form) => handleSave(form, null)}
        />
      )}

      <ul className="space-y-2">
        {initialSteps.length === 0 && editing !== 'new' && (
          <li className="text-sm text-gray-500 border border-dashed border-gray-200 rounded-xl px-4 py-8 text-center">
            Noch keine Stufen angelegt. Lege die erste Mail der Serie an.
          </li>
        )}

        {initialSteps.map((s) =>
          editing && editing !== 'new' && editing.id === s.id ? (
            <li key={s.id}>
              <StepForm
                step={s}
                pending={pending}
                onCancel={() => setEditing(null)}
                onSubmit={(form) => handleSave(form, s.id)}
              />
            </li>
          ) : (
            <li
              key={s.id}
              className={`rounded-xl border px-4 py-3 flex items-start gap-3 ${
                s.active ? 'border-gray-200 bg-white' : 'border-gray-200 bg-gray-50 opacity-70'
              }`}
            >
              <div className="shrink-0 mt-0.5">
                <span className="inline-block text-xs font-semibold px-2 py-1 rounded-md bg-indigo-50 text-indigo-700 whitespace-nowrap">
                  {dayLabel(s.delayDays)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 text-sm truncate">{s.subject}</div>
                <div className="text-xs text-gray-500 line-clamp-2 mt-0.5">{s.body}</div>
                {!s.active && <div className="text-xs text-amber-600 mt-1">inaktiv – wird nicht verschickt</div>}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleTest(s)}
                  disabled={pending}
                  className="text-xs px-2 py-1 rounded-md text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                  title="Testmail an mich"
                >
                  Test
                </button>
                <button
                  onClick={() => handleToggle(s)}
                  disabled={pending}
                  className="text-xs px-2 py-1 rounded-md text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                >
                  {s.active ? 'Pausieren' : 'Aktivieren'}
                </button>
                <button
                  onClick={() => { setError(null); setEditing(s) }}
                  className="text-xs px-2 py-1 rounded-md text-indigo-600 hover:bg-indigo-50"
                >
                  Bearbeiten
                </button>
                <button
                  onClick={() => handleDelete(s.id)}
                  disabled={pending}
                  className="text-xs px-2 py-1 rounded-md text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  Löschen
                </button>
              </div>
            </li>
          ),
        )}
      </ul>

      {editing !== 'new' && (
        <button
          onClick={() => { setError(null); setEditing('new') }}
          className="w-full rounded-xl border border-dashed border-indigo-300 text-indigo-600 text-sm font-medium py-2.5 hover:bg-indigo-50 transition"
        >
          + Neue Stufe
        </button>
      )}
    </div>
  )
}

function StepForm({
  step,
  pending,
  onCancel,
  onSubmit,
}: {
  step: Step | null
  pending: boolean
  onCancel: () => void
  onSubmit: (form: HTMLFormElement) => void
}) {
  const s = step ?? EMPTY
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit(e.currentTarget)
      }}
      className="rounded-xl border border-indigo-200 bg-indigo-50/30 p-4 space-y-3"
    >
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm">
          <span className="block text-gray-600 mb-1">Verzögerung (Tage nach Start)</span>
          <input
            name="delayDays"
            type="number"
            min={0}
            defaultValue={s.delayDays}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <span className="block text-xs text-gray-400 mt-1">0 = sofort beim ersten Login</span>
        </label>
        <label className="text-sm">
          <span className="block text-gray-600 mb-1">Reihenfolge (bei gleicher Verzögerung)</span>
          <input
            name="order"
            type="number"
            defaultValue={s.order}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </label>
      </div>

      <label className="text-sm block">
        <span className="block text-gray-600 mb-1">Betreff</span>
        <input
          name="subject"
          defaultValue={s.subject}
          required
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </label>

      <label className="text-sm block">
        <span className="block text-gray-600 mb-1">Mail-Text</span>
        <textarea
          name="body"
          defaultValue={s.body}
          required
          rows={8}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono leading-relaxed"
        />
        <span className="block text-xs text-gray-400 mt-1 leading-relaxed">
          Leerzeile = neuer Absatz · <code>**fett**</code> · <code>[Text](https://link)</code> ·
          Zeilen mit <code>- </code> = Aufzählung · Platzhalter: <code>{'{{vorname}}'}</code>,{' '}
          <code>{'{{firma}}'}</code>, <code>{'{{dashboard}}'}</code>
        </span>
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm">
          <span className="block text-gray-600 mb-1">Button-Text (optional)</span>
          <input
            name="ctaLabel"
            defaultValue={s.ctaLabel ?? ''}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm">
          <span className="block text-gray-600 mb-1">Button-Link (optional)</span>
          <input
            name="ctaUrl"
            defaultValue={s.ctaUrl ?? ''}
            placeholder="https://…"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input name="active" type="checkbox" defaultChecked={s.active} className="rounded border-gray-300" />
        Aktiv (wird verschickt)
      </label>

      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="text-sm px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-100"
        >
          Abbrechen
        </button>
        <button
          type="submit"
          disabled={pending}
          className="text-sm px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50"
        >
          {pending ? 'Speichern…' : 'Speichern'}
        </button>
      </div>
    </form>
  )
}
