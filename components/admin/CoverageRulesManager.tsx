'use client'

import { useState } from 'react'
import { createCoverageRule, updateCoverageRule, deleteCoverageRule, duplicateCoverageRule } from '@/app/actions/coverage-rules'
import type { CoverageRuleData } from '@/lib/coverage'

const DAY_NAMES = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag']
const DAY_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

type LocationData = { id: string; name: string; color: string }

type Props = {
  rules: CoverageRuleData[]
  locations: LocationData[]
}

type FormState = {
  dayOfWeek: number
  startTime: string
  endTime: string
  minStaff: number
  locationId: string
  label: string
}

const EMPTY_FORM: FormState = {
  dayOfWeek: 0,
  startTime: '09:00',
  endTime: '18:00',
  minStaff: 1,
  locationId: '',
  label: '',
}

export default function CoverageRulesManager({ rules, locations }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [pending, setPending] = useState(false)

  function openNew() {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setShowNew(true)
  }

  function openEdit(rule: CoverageRuleData) {
    setForm({
      dayOfWeek: rule.dayOfWeek,
      startTime: rule.startTime,
      endTime: rule.endTime,
      minStaff: rule.minStaff,
      locationId: rule.locationId ?? '',
      label: rule.label ?? '',
    })
    setEditingId(rule.id)
    setShowNew(false)
  }

  async function handleSaveNew() {
    setPending(true)
    await createCoverageRule({
      dayOfWeek: form.dayOfWeek,
      startTime: form.startTime,
      endTime: form.endTime,
      minStaff: form.minStaff,
      locationId: form.locationId || null,
      label: form.label || null,
    })
    setShowNew(false)
    setPending(false)
  }

  async function handleSaveEdit(id: string) {
    setPending(true)
    await updateCoverageRule(id, {
      dayOfWeek: form.dayOfWeek,
      startTime: form.startTime,
      endTime: form.endTime,
      minStaff: form.minStaff,
      locationId: form.locationId || null,
      label: form.label || null,
    })
    setEditingId(null)
    setPending(false)
  }

  async function handleDuplicate(id: string) {
    await duplicateCoverageRule(id)
  }

  async function handleDelete(id: string) {
    if (!confirm('Vorgabe löschen?')) return
    await deleteCoverageRule(id)
  }

  const grouped = DAY_NAMES.map((name, dow) => ({
    name,
    dow,
    rules: rules.filter((r) => r.dayOfWeek === dow),
  })).filter((g) => g.rules.length > 0 || (showNew && form.dayOfWeek === g.dow))

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Besetzungs-Vorgaben</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Zeiträume, in denen eine Mindestanzahl Mitarbeiter eingeteilt sein muss
            </p>
          </div>
          <button
            onClick={openNew}
            className="px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition active:scale-[0.97]"
          >
            + Vorgabe
          </button>
        </div>

        {rules.length === 0 && !showNew && (
          <div className="px-5 py-8 text-center text-sm text-gray-400">
            Noch keine Vorgaben konfiguriert.
          </div>
        )}

        {showNew && (
          <div className="px-5 py-4 border-b border-gray-100 bg-indigo-50/40">
            <p className="text-xs font-semibold text-indigo-700 mb-3">Neue Vorgabe</p>
            <RuleForm
              form={form}
              onChange={setForm}
              locations={locations}
              onSave={handleSaveNew}
              onCancel={() => setShowNew(false)}
              pending={pending}
            />
          </div>
        )}

        {rules.map((rule) => {
          const loc = locations.find((l) => l.id === rule.locationId)
          if (editingId === rule.id) {
            return (
              <div key={rule.id} className="px-5 py-4 border-b border-gray-100 bg-amber-50/40">
                <p className="text-xs font-semibold text-amber-700 mb-3">Vorgabe bearbeiten</p>
                <RuleForm
                  form={form}
                  onChange={setForm}
                  locations={locations}
                  onSave={() => handleSaveEdit(rule.id)}
                  onCancel={() => setEditingId(null)}
                  pending={pending}
                />
              </div>
            )
          }
          return (
            <div key={rule.id} className="px-5 py-3 border-b border-gray-100 last:border-b-0 flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold text-white"
                style={{ backgroundColor: loc?.color ?? '#6b7280' }}
              >
                {DAY_SHORT[rule.dayOfWeek]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900">
                  {DAY_NAMES[rule.dayOfWeek]}, {rule.startTime}–{rule.endTime} Uhr
                  {rule.minStaff > 1 && (
                    <span className="ml-2 px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs font-semibold">
                      min. {rule.minStaff} Pers.
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {rule.label && <span>{rule.label} · </span>}
                  {loc ? loc.name : 'Alle Standorte'}
                </div>
              </div>
              <button
                onClick={() => openEdit(rule)}
                className="text-xs text-gray-400 hover:text-gray-700 transition px-2 py-1"
              >
                Bearbeiten
              </button>
              <button
                onClick={() => handleDuplicate(rule.id)}
                className="text-xs text-gray-400 hover:text-gray-700 transition px-2 py-1"
              >
                Duplizieren
              </button>
              <button
                onClick={() => handleDelete(rule.id)}
                className="text-xs text-red-400 hover:text-red-600 transition px-2 py-1"
              >
                Löschen
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function RuleForm({
  form,
  onChange,
  locations,
  onSave,
  onCancel,
  pending,
}: {
  form: FormState
  onChange: (f: FormState) => void
  locations: LocationData[]
  onSave: () => void
  onCancel: () => void
  pending: boolean
}) {
  function set(key: keyof FormState, value: string | number) {
    onChange({ ...form, [key]: value })
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Wochentag</label>
        <select
          value={form.dayOfWeek}
          onChange={(e) => set('dayOfWeek', Number(e.target.value))}
          className="w-full text-sm border border-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'].map((d, i) => (
            <option key={i} value={i}>{d}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Von</label>
        <input
          type="time"
          value={form.startTime}
          onChange={(e) => set('startTime', e.target.value)}
          className="w-full text-sm border border-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Bis</label>
        <input
          type="time"
          value={form.endTime}
          onChange={(e) => set('endTime', e.target.value)}
          className="w-full text-sm border border-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Mindestbesetzung</label>
        <input
          type="number"
          min={1}
          max={20}
          value={form.minStaff}
          onChange={(e) => set('minStaff', Number(e.target.value))}
          className="w-full text-sm border border-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Standort</label>
        <select
          value={form.locationId}
          onChange={(e) => set('locationId', e.target.value)}
          className="w-full text-sm border border-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Alle Standorte</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Bezeichnung (optional)</label>
        <input
          type="text"
          value={form.label}
          onChange={(e) => set('label', e.target.value)}
          placeholder="z.B. Rush Hour"
          className="w-full text-sm border border-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div className="col-span-2 sm:col-span-3 flex gap-2 pt-1">
        <button
          onClick={onSave}
          disabled={pending}
          className="px-4 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition active:scale-[0.97] disabled:opacity-50"
        >
          Speichern
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-1.5 text-xs font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition active:scale-[0.97]"
        >
          Abbrechen
        </button>
      </div>
    </div>
  )
}
