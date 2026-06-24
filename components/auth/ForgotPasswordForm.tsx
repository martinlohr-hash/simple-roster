'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { requestPasswordReset } from '@/app/actions/password-reset'

const inputClass =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent'

export default function ForgotPasswordForm() {
  const [done, formAction, pending] = useActionState(
    async (_prev: boolean, formData: FormData) => {
      await requestPasswordReset(formData)
      return true
    },
    false,
  )

  if (done) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-700 bg-green-50 rounded-lg px-3 py-3 leading-relaxed">
          Falls ein Konto mit dieser E-Mail existiert, haben wir dir einen Link zum
          Zurücksetzen deines Passworts geschickt. Bitte sieh in deinem Postfach nach.
        </p>
        <Link
          href="/login"
          className="block w-full text-center py-2.5 px-4 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition active:scale-[0.97]"
        >
          Zurück zur Anmeldung
        </Link>
      </div>
    )
  }

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          E-Mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className={inputClass}
          placeholder="name@beispiel.de"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full py-2.5 px-4 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition active:scale-[0.97]"
      >
        {pending ? 'Wird gesendet...' : 'Link zum Zurücksetzen senden'}
      </button>

      <Link href="/login" className="block text-center text-sm text-gray-500 hover:text-gray-700">
        Zurück zur Anmeldung
      </Link>
    </form>
  )
}
