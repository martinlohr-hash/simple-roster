'use client'

import { useState } from 'react'

const AREAS = [
  'Dienstplan',
  'Vorlagen',
  'Mitarbeiter',
  'Lohnkosten',
  'Export',
  'Einstempeln / Ausstempeln',
  'Login',
  'Sonstiges',
]

const BugIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M12 8v4m0 4h.01M9 3h6l1 2H8L9 3zM4 8h2M18 8h2M5 5l1.5 2M19 5l-1.5 2M5 19l1.5-2M19 19l-1.5-2M8 20h8a2 2 0 002-2v-6a4 4 0 00-8 0v6a2 2 0 002 2z" />
  </svg>
)

export default function BugReportButton() {
  const [open, setOpen] = useState(false)
  const [area, setArea] = useState('')
  const [description, setDescription] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!area || !description.trim()) return
    setSending(true)
    setError('')
    try {
      const res = await fetch('/api/bug-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ area, description }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Fehler beim Senden.')
      } else {
        setSent(true)
        setTimeout(() => {
          setOpen(false)
          setSent(false)
          setArea('')
          setDescription('')
        }, 1800)
      }
    } catch {
      setError('Verbindungsfehler.')
    } finally {
      setSending(false)
    }
  }

  function handleClose() {
    setOpen(false)
    setSent(false)
    setArea('')
    setDescription('')
    setError('')
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Fehler melden"
        className="fixed bottom-5 right-5 z-50 w-11 h-11 rounded-full bg-white border border-gray-200 shadow-md flex items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-200 hover:shadow-lg transition-all duration-150 active:scale-95"
      >
        <BugIcon />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-end p-5" onClick={handleClose}>
          <div
            className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-80 mb-16 mr-0 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-700">
                <BugIcon />
                <span className="font-semibold text-sm">Fehler melden</span>
              </div>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {sent ? (
              <div className="px-5 py-8 flex flex-col items-center gap-2 text-center">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-800">Danke für die Meldung!</p>
                <p className="text-xs text-gray-400">Wir kümmern uns darum.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Betrifft</label>
                  <select
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    required
                    className="w-full text-sm rounded-lg border border-gray-200 px-3 py-2 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">Bereich wählen…</option>
                    {AREAS.map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Beschreibung</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    rows={3}
                    placeholder="Was ist passiert?"
                    className="w-full text-sm rounded-lg border border-gray-200 px-3 py-2 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  />
                </div>
                {error && <p className="text-xs text-red-500">{error}</p>}
                <button
                  type="submit"
                  disabled={sending || !area || !description.trim()}
                  className="w-full py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {sending ? 'Wird gesendet…' : 'Melden'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
