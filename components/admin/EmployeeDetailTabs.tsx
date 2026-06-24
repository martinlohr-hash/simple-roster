'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import EmployeeForm from './EmployeeForm'
import PersonalbogenForm, { type PersonalbogenUser } from './PersonalbogenForm'
import DocumentsLinkForm from './DocumentsLinkForm'
import DocumentGenerator from './DocumentGenerator'

export type DetailTab = 'stammdaten' | 'beschaeftigung' | 'dokumente'

type Location = { id: string; name: string }

const TABS: { key: DetailTab; label: string }[] = [
  { key: 'stammdaten', label: 'Stammdaten' },
  { key: 'beschaeftigung', label: 'Beschäftigung' },
  { key: 'dokumente', label: 'Dokumente' },
]

export default function EmployeeDetailTabs({
  userId,
  initialTab,
  updateAction,
  locations,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  employeeDefaults,
  personalbogenUser,
  documentsUrl,
  contractMissing,
  probezeitMissing,
  regulaerMissing,
}: {
  userId: string
  initialTab: DetailTab
  updateAction: (formData: FormData) => Promise<void>
  locations: Location[]
  // Vollständiger Prisma-User als EmployeeForm-Defaults (überschüssige Felder werden ignoriert)
  employeeDefaults: Record<string, unknown>
  personalbogenUser: PersonalbogenUser
  documentsUrl: string | null
  contractMissing: string[]
  probezeitMissing: string[]
  regulaerMissing: string[]
}) {
  const router = useRouter()
  const [tab, setTab] = useState<DetailTab>(initialTab)

  function select(t: DetailTab) {
    setTab(t)
    // Deep-linkbar halten, ohne Scrollsprung / Remount
    router.replace(`/admin/employees/${userId}?tab=${t}`, { scroll: false })
  }

  return (
    <div>
      {/* Reiter */}
      <div role="tablist" aria-label="Mitarbeiter-Bereiche" className="flex gap-1 mb-5 border-b border-gray-200">
        {TABS.map((t) => {
          const active = tab === t.key
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={active}
              onClick={() => select(t.key)}
              className={`px-4 py-2 text-sm font-medium -mb-px border-b-2 transition ${
                active
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Panels */}
      {tab === 'stammdaten' && (
        <div role="tabpanel" className="max-w-xl">
          <EmployeeForm action={updateAction} locations={locations} defaults={employeeDefaults} />
        </div>
      )}

      {tab === 'beschaeftigung' && (
        <div role="tabpanel">
          <div className="flex flex-wrap items-center justify-end gap-2 mb-4">
            <Link
              href={`/personalbogen-druck/${userId}`}
              className="px-3 py-2 text-sm font-medium rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition whitespace-nowrap"
            >
              Druckansicht (A4 / PDF)
            </Link>
            <a
              href={`/api/personalbogen?format=excel&userId=${userId}`}
              className="px-3 py-2 text-sm font-medium rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition whitespace-nowrap"
            >
              Excel
            </a>
            <a
              href={`/api/personalbogen?format=csv&userId=${userId}`}
              className="px-3 py-2 text-sm font-medium rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition whitespace-nowrap"
            >
              CSV
            </a>
          </div>
          <PersonalbogenForm user={personalbogenUser} />
        </div>
      )}

      {tab === 'dokumente' && (
        <div role="tabpanel" className="max-w-3xl space-y-8">
          <section>
            <h2 className="text-sm font-semibold text-gray-700 mb-2">Original-Dokumente (Google Drive)</h2>
            <p className="text-sm text-gray-500 mb-3">
              Link zum Drive-Ordner dieses Mitarbeiters einfügen – die Originale (unterschriebene
              Verträge, Ausweis, Bescheinigungen) bleiben in Drive.
            </p>
            <DocumentsLinkForm userId={userId} initialUrl={documentsUrl} />
          </section>

          <section>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Dokumente erstellen</h2>
            <DocumentGenerator
              userId={userId}
              contractMissing={contractMissing}
              probezeitMissing={probezeitMissing}
              regulaerMissing={regulaerMissing}
            />
          </section>
        </div>
      )}
    </div>
  )
}
