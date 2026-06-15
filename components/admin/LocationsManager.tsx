'use client'

import { useState } from 'react'
import { createLocation, updateLocation, deleteLocation } from '@/app/actions/locations'

type LocationData = { id: string; name: string; color: string }

const PRESET_COLORS = [
  '#3B82F6', '#8B5CF6', '#10B981', '#F59E0B',
  '#EF4444', '#EC4899', '#14B8A6', '#F97316',
]

type Props = {
  locations: LocationData[]
}

export default function LocationsManager({ locations }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(PRESET_COLORS[0])
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  function openEdit(loc: LocationData) {
    setEditingId(loc.id)
    setEditName(loc.name)
    setEditColor(loc.color)
    setError(null)
  }

  async function handleSaveEdit(id: string) {
    if (!editName.trim()) return
    setPending(true)
    await updateLocation(id, { name: editName.trim(), color: editColor })
    setEditingId(null)
    setPending(false)
  }

  async function handleDelete(id: string) {
    setError(null)
    try {
      await deleteLocation(id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler beim Löschen')
    }
  }

  async function handleCreate() {
    if (!newName.trim()) return
    setPending(true)
    await createLocation({ name: newName.trim(), color: newColor })
    setNewName('')
    setNewColor(PRESET_COLORS[0])
    setShowNew(false)
    setPending(false)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Standorte</h2>
          <p className="text-xs text-gray-500 mt-0.5">Name und Farbe der Standorte anpassen</p>
        </div>
        <button
          onClick={() => { setShowNew(true); setError(null) }}
          className="px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition active:scale-[0.97]"
        >
          + Standort
        </button>
      </div>

      {error && (
        <div className="px-5 py-2.5 bg-red-50 border-b border-red-100 text-xs text-red-700">{error}</div>
      )}

      {showNew && (
        <div className="px-5 py-4 border-b border-gray-100 bg-indigo-50/40">
          <p className="text-xs font-semibold text-indigo-700 mb-3">Neuer Standort</p>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
              <input
                autoFocus
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                placeholder="z.B. Filiale Nord"
                className="w-full text-sm border border-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Farbe</label>
              <ColorPicker value={newColor} onChange={setNewColor} />
            </div>
            <div className="flex gap-2 pb-0.5">
              <button
                onClick={handleCreate}
                disabled={pending || !newName.trim()}
                className="px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
              >
                Speichern
              </button>
              <button
                onClick={() => setShowNew(false)}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}

      {locations.length === 0 && !showNew && (
        <div className="px-5 py-8 text-center text-sm text-gray-400">Noch keine Standorte vorhanden.</div>
      )}

      {locations.map((loc) => (
        <div key={loc.id} className="border-b border-gray-100 last:border-b-0">
          {editingId === loc.id ? (
            <div className="px-5 py-4 bg-amber-50/40">
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
                  <input
                    autoFocus
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit(loc.id)}
                    className="w-full text-sm border border-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Farbe</label>
                  <ColorPicker value={editColor} onChange={setEditColor} />
                </div>
                <div className="flex gap-2 pb-0.5">
                  <button
                    onClick={() => handleSaveEdit(loc.id)}
                    disabled={pending || !editName.trim()}
                    className="px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
                  >
                    Speichern
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                  >
                    Abbrechen
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="px-5 py-3 flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg shrink-0"
                style={{ backgroundColor: loc.color }}
              />
              <span className="flex-1 text-sm font-medium text-gray-900">{loc.name}</span>
              <button
                onClick={() => openEdit(loc)}
                className="text-xs text-gray-400 hover:text-gray-700 transition px-2 py-1"
              >
                Bearbeiten
              </button>
              <button
                onClick={() => handleDelete(loc.id)}
                className="text-xs text-red-400 hover:text-red-600 transition px-2 py-1"
              >
                Löschen
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex items-center gap-1.5">
      {PRESET_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={`w-6 h-6 rounded-full transition active:scale-90 ${value === c ? 'ring-2 ring-offset-1 ring-gray-500' : ''}`}
          style={{ backgroundColor: c }}
        />
      ))}
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-6 h-6 rounded cursor-pointer border-0 p-0 bg-transparent"
        title="Eigene Farbe"
      />
    </div>
  )
}
