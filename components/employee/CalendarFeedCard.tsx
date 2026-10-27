'use client'

import { useState } from 'react'
import { rotateIcalToken } from '@/app/actions/profile'

type Props = {
  // https-URL des persönlichen Feeds oder null, wenn noch kein Token existiert
  feedUrl: string | null
}

/**
 * „Dienstplan im Kalender" – persönlicher iCal-Feed zum Abonnieren.
 * Einmal in der Kalender-App hinterlegt, erscheinen die eigenen Schichten
 * automatisch (iPhone/Android/Google Kalender aktualisieren selbstständig).
 */
export default function CalendarFeedCard({ feedUrl: initialUrl }: Props) {
  const [feedUrl, setFeedUrl] = useState(initialUrl)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const webcalUrl = feedUrl ? feedUrl.replace(/^https?:\/\//, 'webcal://') : null

  async function createOrRotate(confirmText?: string) {
    if (confirmText && !confirm(confirmText)) return
    setBusy(true)
    setError(null)
    try {
      const res = await rotateIcalToken()
      if (res.error || !res.token) {
        setError(res.error ?? 'Konnte Link nicht erstellen')
        return
      }
      const base = window.location.origin
      setFeedUrl(`${base}/api/ical/${res.token}`)
      setCopied(false)
    } catch {
      setError('Konnte Link nicht erstellen – bitte nochmal versuchen')
    } finally {
      setBusy(false)
    }
  }

  async function copyLink() {
    if (!webcalUrl) return
    try {
      await navigator.clipboard.writeText(webcalUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      setError('Kopieren nicht möglich – Link bitte manuell markieren')
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5">
      <div className="flex items-center gap-2 mb-1">
        <span aria-hidden>📅</span>
        <h2 className="text-sm font-semibold text-gray-900">Dienstplan im Kalender</h2>
      </div>
      <p className="text-xs text-gray-500 mb-4">
        Abonniere deinen persönlichen Kalender-Link – deine Schichten erscheinen automatisch
        in der Kalender-App auf deinem Handy und bleiben aktuell.
      </p>

      {feedUrl ? (
        <>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={webcalUrl ?? ''}
              onFocus={(e) => e.currentTarget.select()}
              className="flex-1 min-w-0 px-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-600 bg-gray-50 font-mono"
              aria-label="Kalender-Link"
            />
            <button
              type="button"
              onClick={copyLink}
              className="shrink-0 px-3 py-2 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition active:scale-[0.97]"
            >
              {copied ? '✓ Kopiert' : 'Kopieren'}
            </button>
          </div>
          <div className="mt-3 text-[11px] text-gray-500 space-y-1">
            <p><strong>iPhone:</strong> Link kopieren → Einstellungen → Kalender → Accounts → Kalenderabo hinzufügen.</p>
            <p><strong>Google Kalender:</strong> Am Computer unter {'„Weitere Kalender + → Per URL"'} einfügen (https statt webcal).</p>
          </div>
          <button
            type="button"
            onClick={() => createOrRotate('Neuen Link erstellen? Der alte Kalender-Link funktioniert danach nicht mehr.')}
            disabled={busy}
            className="mt-3 text-[11px] text-gray-500 hover:text-gray-600 underline disabled:opacity-50"
          >
            {busy ? 'Bitte warten…' : 'Link zurücksetzen (alter Link wird ungültig)'}
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => createOrRotate()}
          disabled={busy}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition active:scale-[0.97]"
        >
          {busy ? 'Bitte warten…' : 'Kalender-Link erstellen'}
        </button>
      )}

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  )
}
