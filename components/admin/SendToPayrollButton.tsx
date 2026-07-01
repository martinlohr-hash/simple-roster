'use client'

import { useState, useTransition } from 'react'
import { sendPersonalbogenToPayroll } from '@/app/actions/personalbogen'

export default function SendToPayrollButton({ userId }: { userId: string }) {
  const [isPending, startTransition] = useTransition()
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  function handleClick() {
    if (isPending) return
    if (!confirm('Personalbogen jetzt an das Lohnbüro (info@optilon.de) senden?')) return
    setMsg(null)
    startTransition(async () => {
      const res = await sendPersonalbogenToPayroll(userId)
      if ('ok' in res) {
        setMsg({ kind: 'ok', text: `Gesendet an ${res.to}. Kopie liegt in deinem „Gesendet“-Ordner.` })
      } else {
        setMsg({ kind: 'err', text: res.error })
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
      {msg && (
        <span className={`text-xs ${msg.kind === 'ok' ? 'text-emerald-600' : 'text-red-600'}`}>
          {msg.text}
        </span>
      )}
    </div>
  )
}
