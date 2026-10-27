'use client'

import { useState, useTransition } from 'react'
import { createVacationRequest } from '@/app/actions/vacations'

const inputClass =
  'w-full min-h-11 px-3.5 py-2.5 border border-gray-500 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent'

export default function VacationForm() {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  function handleSubmit(formData: FormData) {
    setError(null)
    setSuccess(false)
    startTransition(async () => {
      const result = await createVacationRequest(formData)
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(true)
        ;(document.getElementById('vacation-form') as HTMLFormElement)?.reset()
      }
    })
  }

  return (
    <form id="vacation-form" action={handleSubmit} className="space-y-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h2 className="text-sm font-semibold text-gray-900">Urlaub beantragen</h2>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-800 mb-1.5">Von</label>
          <input type="date" name="startDate" required className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-800 mb-1.5">Bis</label>
          <input type="date" name="endDate" required className={inputClass} />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-800 mb-1.5">Notiz (optional)</label>
        <input type="text" name="note" placeholder="z.B. Sommerurlaub" className={inputClass} />
      </div>
      {error && <p role="alert" className="text-sm text-red-800 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
      {success && <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">Antrag wurde eingereicht.</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full py-2.5 px-4 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition active:scale-[0.98]"
      >
        {pending ? 'Wird eingereicht…' : 'Urlaub beantragen'}
      </button>
    </form>
  )
}
