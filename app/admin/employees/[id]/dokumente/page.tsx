import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/db'
import { missingFields } from '@/lib/documents'
import DocumentsLinkForm from '@/components/admin/DocumentsLinkForm'
import DocumentGenerator from '@/components/admin/DocumentGenerator'

export const metadata = { title: 'Dokumente' }

type Props = { params: Promise<{ id: string }> }

export default async function EmployeeDocumentsPage({ params }: Props) {
  const { id } = await params
  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) notFound()

  const contractMissing = missingFields(user, 'arbeitsvertrag')
  const probezeitMissing = missingFields(user, 'kuendigung-probezeit')
  const regulaerMissing = missingFields(user, 'kuendigung-regulaer')

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl">
      <div className="mb-6">
        <Link href="/admin/employees" className="text-sm text-gray-500 hover:text-gray-900">
          ← Mitarbeiter
        </Link>
        <h1 className="text-xl font-semibold text-gray-900 mt-2">Dokumente – {user.name}</h1>
        <p className="text-sm text-gray-500 mt-1">
          Originale liegen in Google Drive (nur verlinkt). Verträge & Kündigungen werden aus den
          Personalbogen-Daten generiert.
        </p>
      </div>

      {/* Drive-Ordner */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-gray-700 mb-2">Original-Dokumente (Google Drive)</h2>
        <p className="text-sm text-gray-500 mb-3">
          Link zum Drive-Ordner dieses Mitarbeiters einfügen – die Originale (unterschriebene Verträge,
          Ausweis, Bescheinigungen) bleiben in Drive.
        </p>
        <DocumentsLinkForm userId={user.id} initialUrl={user.documentsUrl} />
      </section>

      {/* Generator */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700">Dokumente erstellen</h2>
          <Link
            href={`/admin/employees/${user.id}/personalbogen`}
            className="text-xs font-medium text-gray-500 hover:text-indigo-600"
          >
            Personalbogen bearbeiten →
          </Link>
        </div>
        <DocumentGenerator
          userId={user.id}
          contractMissing={contractMissing}
          probezeitMissing={probezeitMissing}
          regulaerMissing={regulaerMissing}
        />
      </section>
    </div>
  )
}
