import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { getSession } from '@/app/actions/auth'
import { isAdmin } from '@/lib/session'
import DocumentSheet from '@/components/admin/DocumentSheet'
import {
  COMPANY, addressLines, anrede, dDot,
  kuendigungEndDate, gesetzlicheFrist, missingFields, type DocType,
} from '@/lib/documents'

export const metadata = { title: 'Kündigung (Druck)' }

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ art?: string; form?: string }>
}

export default async function KuendigungPrintPage({ params, searchParams }: Props) {
  const session = await getSession()
  if (!session || !isAdmin(session.role)) redirect('/login')

  const { id } = await params
  const sp = await searchParams
  const art: DocType = sp.art === 'regulaer' ? 'kuendigung-regulaer' : 'kuendigung-probezeit'
  const form: 'du' | 'sie' = sp.form === 'sie' ? 'sie' : 'du'
  const probezeit = art === 'kuendigung-probezeit'

  const u = await prisma.user.findUnique({ where: { id } })
  if (!u) notFound()

  const letterDate = new Date()
  const end = kuendigungEndDate(u, art, letterDate)
  const frist = gesetzlicheFrist(u.startDate, letterDate)
  const greeting = anrede(form, u.gender, u.firstName || '', u.lastName || '')
  const missing = missingFields(u, art)

  return (
    <DocumentSheet backHref={`/admin/employees/${u.id}/dokumente`} backLabel="← Zurück zu Dokumente">
      {missing.length > 0 && (
        <div className="no-print mb-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-[13px] text-amber-800">
          <strong>Unvollständige Daten:</strong> Folgende Felder fehlen im Personalbogen:{' '}
          {missing.join(', ')}.
        </div>
      )}

      {/* Empfänger-Adressblock */}
      <div className="mb-10">
        {addressLines(u).map((l, i) => (
          <div key={i}>{l}</div>
        ))}
      </div>

      {/* Ort, Datum */}
      <p className="text-right mb-8">Hamburg, {dDot(letterDate)}</p>

      {/* Betreff */}
      <p className="font-bold mb-6">
        Kündigung des Arbeitsverhältnisses{probezeit ? ' während der Probezeit' : ''}
      </p>

      {/* Anrede */}
      <p className="mb-4">{greeting}</p>

      {/* Hauptteil */}
      {probezeit ? (
        <p className="mb-4">
          hiermit kündige ich das mit {form === 'sie' ? 'Ihnen' : 'Dir'} am{' '}
          {dDot(u.startDate) || '____________'} geschlossene Arbeitsverhältnis innerhalb der Probezeit
          unter Einhaltung der vereinbarten Kündigungsfrist von zwei Wochen. Das Arbeitsverhältnis
          endet somit zum {dDot(end) || '____________'}, hilfsweise 14 Tage nach Erhalt der Kündigung.
        </p>
      ) : (
        <p className="mb-4">
          hiermit kündige ich das mit {form === 'sie' ? 'Ihnen' : 'Dir'} am{' '}
          {dDot(u.startDate) || '____________'} geschlossene Arbeitsverhältnis ordentlich und
          fristgerecht unter Einhaltung der gesetzlichen Kündigungsfrist von {frist}. Das
          Arbeitsverhältnis endet somit zum {dDot(end) || '____________'}.
        </p>
      )}

      {form === 'sie' ? (
        <p className="mb-4">
          Bitte beachten Sie, dass Sie verpflichtet sind, sich unverzüglich – spätestens innerhalb von
          drei Tagen nach Erhalt dieser Kündigung – persönlich bei der Agentur für Arbeit
          arbeitssuchend zu melden, um Nachteile beim Arbeitslosengeld zu vermeiden.
        </p>
      ) : (
        <p className="mb-4">
          Bitte beachte, dass Du verpflichtet bist, Dich unverzüglich – spätestens innerhalb von drei
          Tagen nach Erhalt dieser Kündigung – persönlich bei der Agentur für Arbeit arbeitssuchend zu
          melden, um Nachteile beim Arbeitslosengeld zu vermeiden.
        </p>
      )}

      <p className="mb-8">
        Etwaige Firmengegenstände sind spätestens am letzten Arbeitstag vollständig zurückzugeben.
      </p>

      {/* Grußformel */}
      <p className="mb-10">Mit freundlichen Grüßen</p>
      <div className="mb-16">
        <div>{COMPANY.managingDirector}</div>
        <div>Geschäftsführer</div>
        <div>{COMPANY.name}</div>
      </div>

      {/* Empfangsbestätigung */}
      <div className="mt-10 break-inside-avoid">
        <p className="mb-8">Hamburg, ____________________</p>
        <div className="border-t border-black pt-1 text-[11px] max-w-[320px]">
          Datum / Kündigung erhalten, behelfsmäßig Zeuge
        </div>
      </div>

      {/* Fuß */}
      <div className="mt-12 pt-3 border-t border-gray-300 text-[9px] text-gray-500 leading-snug">
        {COMPANY.footerLines.map((l) => (
          <div key={l}>{l}</div>
        ))}
      </div>
    </DocumentSheet>
  )
}
