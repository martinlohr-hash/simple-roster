'use client'

import { useActionState } from 'react'
import { completeOnboarding } from '@/app/actions/onboarding'

const inputClass =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent'

type Props = { token: string; defaultName: string }

export default function OnboardingForm({ token, defaultName }: Props) {
  const boundAction = completeOnboarding.bind(null, token)
  const [error, formAction, pending] = useActionState(
    async (_prev: string | undefined, formData: FormData) => {
      const result = await boundAction(formData)
      return result?.error
    },
    undefined,
  )

  return (
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
  )
}
