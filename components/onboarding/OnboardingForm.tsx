'use client'

import { useActionState, useEffect, useState } from 'react'
import { completeOnboarding } from '@/app/actions/onboarding'

const SAMMIE_IMAGES = ['/sammie-1.png','/sammie-2.png','/sammie-3.png','/sammie-4.png','/sammie-5.png','/sammie-6.png']

const inputClass =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent'

type Props = { token: string; defaultName: string }

export default function OnboardingForm({ token, defaultName }: Props) {
  const [sammie, setSammie] = useState<string | null>(null)
  useEffect(() => {
    setSammie(SAMMIE_IMAGES[Math.floor(Math.random() * SAMMIE_IMAGES.length)])
  }, [])

  const boundAction = completeOnboarding.bind(null, token)
  const [error, formAction, pending] = useActionState(
    async (_prev: string | undefined, formData: FormData) => {
      const result = await boundAction(formData)
      return result?.error
    },
    undefined,
  )

  return (
    <>
      {sammie && (
        <div className="fixed bottom-0 right-0 pointer-events-none select-none" style={{ mixBlendMode: 'multiply' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={sammie} alt="" className="w-[280px] sm:w-[360px] lg:w-[420px]" />
        </div>
      )}
    <form action={formAction} className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Name
        </label>
        <input
          name="name"
          type="text"
          defaultValue={defaultName}
          className={inputClass}
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Passwort
        </label>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          placeholder="Mindestens 8 Zeichen"
          className={inputClass}
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Passwort bestätigen
        </label>
        <input
          name="confirmPassword"
          type="password"
          required
          className={inputClass}
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full py-2.5 px-4 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition active:scale-[0.97]"
      >
        {pending ? 'Wird gespeichert...' : 'Konto aktivieren'}
      </button>
    </form>
    </>
  )
}
