'use client'

import Link from 'next/link'
import { useActionState, useEffect, useState } from 'react'
import { login } from '@/app/actions/auth'

const SAMMIE_IMAGES = [
  '/sammie-1.png',
  '/sammie-2.png',
  '/sammie-3.png',
  '/sammie-4.png',
  '/sammie-5.png',
  '/sammie-6.png',
]

export default function LoginPage() {
  const [error, action, pending] = useActionState(
    async (_: string | undefined, formData: FormData) => {
      const result = await login(formData)
      return result?.error
    },
    undefined,
  )

  const [sammie, setSammie] = useState<string | null>(null)
  const [resetDone, setResetDone] = useState(false)
  useEffect(() => {
    setSammie(SAMMIE_IMAGES[Math.floor(Math.random() * SAMMIE_IMAGES.length)])
    setResetDone(new URLSearchParams(window.location.search).get('reset') === 'ok')
  }, [])

  return (
    <div className="min-h-dvh flex items-center justify-center bg-gray-50 overflow-hidden px-4 py-8 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
      {sammie && (
        <div className="fixed bottom-0 right-0 z-0 pointer-events-none select-none" aria-hidden="true" style={{ mixBlendMode: 'multiply' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={sammie} alt="" className="w-[280px] sm:w-[360px] lg:w-[420px]" />
        </div>
      )}
      <div className="relative z-10 w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-600 mb-4">
              <svg aria-hidden="true" className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold text-gray-900">SimpleRoster</h1>
            <p className="text-base text-gray-600 mt-1">Bitte melde dich an</p>
          </div>

          {resetDone && (
            <p role="status" className="text-sm text-green-800 bg-green-50 rounded-lg px-3 py-2 mb-4">
              Dein Passwort wurde geändert. Du kannst dich jetzt anmelden.
            </p>
          )}

          <form action={action} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-800 mb-1.5">
                E-Mail
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                required
                aria-describedby={error ? 'login-error' : undefined}
                className="w-full min-h-11 px-3.5 py-2.5 border border-gray-500 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="name@beispiel.de"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-800 mb-1.5">
                Passwort
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                aria-describedby={error ? 'login-error' : undefined}
                className="w-full min-h-11 px-3.5 py-2.5 border border-gray-500 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <div className="flex justify-end">
                <Link
                  href="/passwort-vergessen"
                  className="inline-flex min-h-11 items-center text-sm text-indigo-700 hover:text-indigo-800 hover:underline rounded focus-visible:outline-2 focus-visible:outline-indigo-500"
                >
                  Passwort vergessen?
                </Link>
              </div>
            </div>
            {error && (
              <p id="login-error" role="alert" className="text-sm text-red-800 bg-red-50 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={pending}
              aria-busy={pending}
              className="w-full min-h-11 py-2.5 px-4 bg-indigo-600 text-white text-base font-semibold rounded-xl hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition active:scale-[0.97]"
            >
              {pending ? 'Anmelden …' : 'Anmelden'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
