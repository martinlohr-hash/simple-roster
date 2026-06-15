'use client'

import { useState } from 'react'
import { saveWeekAsTemplate, applyTemplate, updateTemplateFromWeek, setDefaultTemplate, clearDefaultTemplate } from '@/app/actions/templates'

type Template = { id: string; name: string; isDefault: boolean; _count: { entries: number } }

type Props = {
  weekStart: string
  templates: Template[]
}

export default function TemplateToolbar({ weekStart, templates }: Props) {
  const [saving, setSaving] = useState(false)
  const [applying, setApplying] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [settingDefault, setSettingDefault] = useState(false)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [error, setError] = useState('')

  const selected = templates.find((t) => t.id === selectedTemplate)
  const currentDefault = templates.find((t) => t.isDefault)

  async function handleSave() {
    if (!templateName.trim()) return
    setSaving(true)
    setError('')
    try {
      await saveWeekAsTemplate(weekStart, templateName.trim())
      setShowSaveModal(false)
      setTemplateName('')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Fehler beim Speichern')
    } finally {
      setSaving(false)
    }
  }

  async function handleApply() {
    if (!selectedTemplate) return
    if (!confirm(`Vorlage «${selected?.name}» auf diese Woche anwenden?\nBestehende Schichten bleiben erhalten.`)) return
    setApplying(true)
    try {
      await applyTemplate(selectedTemplate, weekStart)
    } finally {
      setApplying(false)
    }
  }

  async function handleUpdate() {
    if (!selectedTemplate) return
    if (!confirm(`Vorlage «${selected?.name}» mit den Schichten dieser Woche überschreiben?`)) return
    setUpdating(true)
    setError('')
    try {
      await updateTemplateFromWeek(selectedTemplate, weekStart)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Fehler beim Aktualisieren')
    } finally {
      setUpdating(false)
    }
  }

  async function handleSetDefault() {
    if (!selectedTemplate) return
    setSettingDefault(true)
    try {
      if (selected?.isDefault) {
        await clearDefaultTemplate()
      } else {
        await setDefaultTemplate(selectedTemplate)
      }
    } finally {
      setSettingDefault(false)
    }
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {templates.length > 0 && (
          <div className="flex items-center gap-1.5">
            <select
              value={selectedTemplate}
              onChange={(e) => { setSelectedTemplate(e.target.value); setError('') }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Vorlage wählen…</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.isDefault ? '★ ' : ''}{t.name} ({t._count.entries} Schichten)
                </option>
              ))}
            </select>
            {selectedTemplate && (
              <button
                onClick={handleSetDefault}
                disabled={settingDefault}
                title={selected?.isDefault ? 'Standard entfernen' : 'Als Standard-Vorlage setzen (wird bei leerer Woche automatisch geladen)'}
                className={`px-2.5 py-2 text-sm rounded-lg border transition active:scale-[0.97] disabled:opacity-40 ${
                  selected?.isDefault
                    ? 'bg-amber-100 border-amber-400 text-amber-700 hover:bg-amber-200'
                    : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                }`}
              >
                ★
              </button>
            )}
            <button
              onClick={handleApply}
              disabled={!selectedTemplate || applying}
              className="px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-40 transition active:scale-[0.97] whitespace-nowrap font-medium"
            >
              {applying ? 'Wird angewendet…' : 'Anwenden'}
            </button>
            <button
              onClick={handleUpdate}
              disabled={!selectedTemplate || updating}
              title={selectedTemplate ? `«${selected?.name}» mit dieser Woche überschreiben` : ''}
              className="px-3 py-2 text-sm border border-amber-400 text-amber-800 bg-amber-50 rounded-lg hover:bg-amber-100 disabled:opacity-40 transition active:scale-[0.97] whitespace-nowrap font-medium"
            >
              {updating ? 'Wird aktualisiert…' : 'Aktualisieren'}
            </button>
          </div>
        )}

        <button
          onClick={() => setShowSaveModal(true)}
          className="px-3 py-2 text-sm border border-indigo-400 text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition active:scale-[0.97] flex items-center gap-1.5 whitespace-nowrap font-medium"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
          </svg>
          Als Vorlage speichern
        </button>
      </div>

      {currentDefault && (
        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 mt-1">
          Standard-Vorlage: <span className="font-medium">{currentDefault.name}</span> — wird bei leeren Wochen automatisch geladen
        </div>
      )}

      {error && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-1.5 mt-1">
          {error}
        </div>
      )}

      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Woche als Vorlage speichern</h2>
            <p className="text-sm text-gray-500 mb-4">
              Alle Schichten dieser Woche werden als neue Vorlage gespeichert.
            </p>
            <input
              autoFocus
              type="text"
              placeholder="Vorlagenname, z.B. »Standardwoche«"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-2"
            />
            {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => { setShowSaveModal(false); setTemplateName(''); setError('') }}
                className="flex-1 py-2 border border-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 transition active:scale-[0.97]"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSave}
                disabled={!templateName.trim() || saving}
                className="flex-1 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition active:scale-[0.97]"
              >
                {saving ? 'Speichern…' : 'Speichern'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
