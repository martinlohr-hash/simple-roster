import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gray-100 mb-4">
          <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Seite nicht gefunden</h1>
        <p className="text-sm text-gray-500 mb-6">
          Diese Seite gibt es nicht (mehr). Vielleicht ist ein Link veraltet.
        </p>
        <Link
          href="/login"
          className="inline-block py-2.5 px-5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition active:scale-[0.97]"
        >
          Zur Anmeldung
        </Link>
      </div>
    </div>
  )
}
