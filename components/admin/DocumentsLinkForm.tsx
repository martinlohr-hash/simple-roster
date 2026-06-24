'use client'

import { useState, useTransition } from 'react'
import { saveDocumentsUrl } from '@/app/actions/employees'

export default function DocumentsLinkForm({
  userId,
  initialUrl,
}: {
  userId: string
  initialUrl: string | null
}) {
  const [url, setUrl] = useState(initialUrl ?? '')
  const [saved, setSaved] = useState<string | null>(initialUrl)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const fd = new FormData()
    fd.set('documentsUrl', url)
    startTransition(async () => {
      const res = await saveDocumentsUrl(userId, fd)
      if (res?.error) setError(res.error)
      else setSaved(url.trim() || null)
    })
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://drive.google.com/drive/folders/…"
          className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          type="submit"
          disabled={pending}
          className="px-4 py-2 text-sm font-medium rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition disabled:opacity-50 whitespace-nowrap"
        >
          {pending ? 'Speichern…' : 'Speichern'}
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && (
        <a
          href={saved}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition"
        >
          📁 Dokumente in Google Drive öffnen
        </a>
      )}
    </form>
  )
}
