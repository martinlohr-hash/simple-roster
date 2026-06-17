'use client'

import { useState, useTransition } from 'react'
import { resendInvite } from '@/app/actions/employees'

export default function ResendInviteButton({ id }: { id: string }) {
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleResend() {
    startTransition(async () => {
      const { inviteToken } = await resendInvite(id)
      setInviteLink(`${window.location.origin}/onboarding/${inviteToken}`)
    })
  }

  if (inviteLink) {
    return (
      <div className="flex items-center gap-1">
        <input
          readOnly
          value={inviteLink}
          className="px-2 py-0.5 text-[10px] border border-gray-300 rounded bg-gray-50 font-mono w-48"
        />
        <button
          onClick={() => {
            navigator.clipboard.writeText(inviteLink)
            setCopied(true)
            setTimeout(() => { setCopied(false); setInviteLink(null) }, 2000)
          }}
          className="text-[10px] px-1.5 py-0.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition active:scale-[0.97] whitespace-nowrap"
        >
          {copied ? 'Kopiert!' : 'Kopieren'}
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={handleResend}
      disabled={isPending}
      className="text-xs text-amber-600 hover:text-amber-700 font-medium disabled:opacity-50"
    >
      {isPending ? '...' : 'Einladungslink'}
    </button>
  )
}
