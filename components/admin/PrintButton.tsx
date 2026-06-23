'use client'

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="px-4 py-2 text-sm font-medium rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition active:scale-[0.97]"
    >
      Drucken / als PDF speichern
    </button>
  )
}
