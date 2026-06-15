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
      <div className="flex flex-col items-end gap-1.5">
        <div className="flex items-center gap-2">
          {templates.length > 0 && (
            <>
              <select
                value={selectedTemplate}
                onChange={(e) => { setSelectedTemplate(e.target.value); setError('') }}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-700 min-w-[180px]"
              >
                <option value="">Vorlage wählen …</option>
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
                  title={selected?.isDefault ? 'Standard entfernen' : 'Als Standard setzen (wird bei leerer Woche automatisch geladen)'}
                  className={`px-2.5 py-2 text-sm rounded-lg border transition active:scale-[0.97] disabled:opacity-40 ${
                    selected?.isDefault
                      ? 'bg-amber-100 border-amber-400 text-amber-700 hover:bg-amber-200'
                      : 'bg-white border-gray-300 text-gray-400 hover:bg-gray-50'
                  }`}
                >
                  ★
                </button>
              )}

              <button
                onClick={handleApply}
                disabled={!selectedTemplate || applying}
                className="px-3 py-2 text-sm text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition active:scale-[0.97] font-medium whitespace-nowrap"
              >
                {applying ? 'Wird angewendet…' : 'Anwenden'}
              </button>

              <button
                onClick={handleUpdate}
                disabled={!selectedTemplate || updating}
                title={selectedTemplate ? `«${selected?.name}» mit dieser Woche überschreiben` : ''}
                className="px-3 py-2 text-sm border border-indigo-300 text-indigo-600 bg-white rounded-lg hover:bg-indigo-50 disabled:opacity-40 disabled:cursor-not-allowed transition active:scale-[0.97] font-medium whitespace-nowrap flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {updating ? 'Wird aktualisiert…' : 'Aktualisieren'}
              </button>
            </>
          )}
        </div>

        <button
          onClick={() => setShowSaveModal(true)}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors duration-150"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
          Als Vorlage speichern
        </button>

        {error && (
          <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-1.5">
            {error}
          </div>
        )}
      </div>

      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 modal-overlay">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4 modal-panel">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Woche als Vorlage speichern</h2>
            <p className="text-sm text-gray-500 mb-4">
              Alle Schichten dieser Woche werden als neue Vorlage gespeichert.
            </p>
            <input
              autoFocus
              type="text"
              placeholder="Vorlagenname, z. B. »Standardwoche«"
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
