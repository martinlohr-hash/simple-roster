'use client'

import { useState, useTransition } from 'react'
import { sendPersonalbogenToPayroll } from '@/app/actions/personalbogen'

function formatBerlin(iso: string): string {
  const d = new Date(iso)
  const datum = d.toLocaleDateString('de-DE', {
    timeZone: 'Europe/Berlin', day: '2-digit', month: '2-digit', year: 'numeric',
  })
  const zeit = d.toLocaleTimeString('de-DE', {
    timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit',
  })
  return `${datum} um ${zeit} Uhr`
}

export default function SendToPayrollButton({
  userId,
  sentAt,
}: {
  userId: string
  sentAt: string | null
}) {
  const [isPending, startTransition] = useTransition()
  const [lastSent, setLastSent] = useState<string | null>(sentAt)
  const [error, setError] = useState<string | null>(null)

  function handleClick() {
    if (isPending) return
    if (!confirm('Sofortmeldung jetzt an das Lohnbüro (info@optilon.de) senden?')) return
    setError(null)
    startTransition(async () => {
      const res = await sendPersonalbogenToPayroll(userId)
      if ('ok' in res) {
        setLastSent(res.sentAt)
      } else {
        setError(res.error)
      }
    })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="px-3 py-2 text-sm font-medium rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition whitespace-nowrap disabled:opacity-50 active:scale-[0.97]"
      >
        {isPending ? 'Wird gesendet…' : 'An Lohnbüro senden'}
      </button>
      {lastSent && !error && (
        <span className="text-xs text-emerald-600">
          Sofortmeldung versendet am {formatBerlin(lastSent)}
        </span>
      )}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  )
}
