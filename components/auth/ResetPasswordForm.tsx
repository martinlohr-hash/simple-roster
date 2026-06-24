'use client'

import { useActionState } from 'react'
import { completePasswordReset } from '@/app/actions/password-reset'

const inputClass =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent'

type Props = { token: string; email: string }

export default function ResetPasswordForm({ token, email }: Props) {
  const boundAction = completePasswordReset.bind(null, token)
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
          E-Mail (dein Login)
        </label>
        <input
          name="email"
          type="email"
          value={email}
          readOnly
          autoComplete="username"
          className={`${inputClass} bg-gray-50 text-gray-500 cursor-default`}
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Neues Passwort
        </label>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
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
          autoComplete="new-password"
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
        {pending ? 'Wird gespeichert...' : 'Neues Passwort speichern'}
      </button>
    </form>
  )
}
