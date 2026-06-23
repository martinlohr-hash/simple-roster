import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { prisma } from '@/lib/db'
import { getSession } from '@/app/actions/auth'
import { isAdmin } from '@/lib/session'
import { COMPANY_NAME } from '@/lib/company'
import PrintButton from '@/components/admin/PrintButton'

export const metadata = { title: 'Personalbogen (Druck)' }

const GENDER_LABELS: Record<string, string> = { MALE: 'männlich', FEMALE: 'weiblich', DIVERSE: 'divers' }
const PAYROLL_LABELS: Record<string, string> = {
  SV_PFLICHTIG: 'Sozialversicherungspflichtig',
  AUSZUBILDENDER: 'Auszubildender',
  MINIJOBBER: 'Minijobber',
  WERKSTUDENT: 'Werkstudent',
  KURZFRISTIG: 'Kurzfristige Beschäftigung',
  PFLICHTPRAKTIKUM: 'Pflichtpraktikum',
  GESCHAEFTSFUEHRER: 'Geschäftsführer',
  SONSTIGES: 'Sonstiges',
}
const OTHER_LABELS: Record<string, string> = {
  NEIN: 'Nein',
  JA_SV_PFLICHTIG: 'Ja, Sv-Pflichtig',
  JA_MINIJOB: 'Ja, Minijob',
  JA_KURZFRISTIG: 'Ja, kurzfristige Beschäftigung',
  JA_SELBSTSTAENDIG: 'Ja, Selbstständigkeit',
}

const d = (v: Date | null) => (v ? format(v, 'dd.MM.yyyy') : '')

// Ein einzelnes Formularfeld: Label oben, Wert auf einer Unterlinie (auch leer ausdruckbar).
function Field({ label, value, wide }: { label: string; value?: string | number | null; wide?: boolean }) {
  const v = value === 0 ? '0' : value ? String(value) : ''
  return (
    <div className={wide ? 'col-span-2' : ''}>
      <div className="text-[9px] uppercase tracking-wide text-gray-500">{label}</div>
      <div className="min-h-[18px] border-b border-gray-300 text-[12px] text-gray-900 pb-0.5">{v || ' '}</div>
    </div>
  )
}

type Props = { params: Promise<{ id: string }> }

export default async function PersonalbogenPrintPage({ params }: Props) {
  const session = await getSession()
  if (!session || !isAdmin(session.role)) redirect('/login')

  const { id } = await params
  const u = await prisma.user.findUnique({ where: { id } })
  if (!u) notFound()

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white">
      {/* Druckspezifische Regeln: A4, Seitenrand, Bildschirm-Chrome im Druck ausblenden */}
      <style>{`
        @page { size: A4; margin: 12mm; }
        @media print {
          .no-print { display: none !important; }
          .sheet { box-shadow: none !important; margin: 0 !important; }
          html, body { background: #fff !important; }
        }
      `}</style>

      {/* Aktionsleiste – wird nicht mitgedruckt */}
      <div className="no-print sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="max-w-[820px] mx-auto px-4 py-3 flex items-center justify-between">
          <Link href={`/admin/employees/${u.id}/personalbogen`} className="text-sm text-gray-500 hover:text-gray-900">
            ← Zurück zum Bogen
          </Link>
          <PrintButton />
        </div>
      </div>

      {/* A4-Blatt */}
      <div className="sheet bg-white max-w-[820px] mx-auto my-6 p-10 shadow-sm print:my-0 print:p-0 print:shadow-none">
        {/* Kopf */}
        <div className="flex items-start justify-between border-b-2 border-gray-800 pb-3 mb-5">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Personalbogen</h1>
            <p className="text-[11px] text-gray-500 mt-0.5">Stammdaten für die Lohnabrechnung</p>
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold text-gray-900">{COMPANY_NAME}</div>
            <div className="text-[10px] text-gray-500 mt-0.5">Erstellt am {format(new Date(), 'dd.MM.yyyy')}</div>
          </div>
        </div>

        {/* Angaben zum Mitarbeiter */}
        <h2 className="text-[11px] font-bold uppercase tracking-wide text-white bg-gray-800 px-2 py-1 rounded-sm mb-3 print:bg-gray-800">
          Angaben zum Mitarbeiter
        </h2>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 mb-6">
          <Field label="Name" value={u.lastName || u.name} />
          <Field label="Vorname" value={u.firstName} />
          <Field label="Straße und Hausnummer" value={u.street} wide />
          <Field label="PLZ" value={u.postalCode} />
          <Field label="Ort" value={u.city} />
          <Field label="Geburtsdatum" value={d(u.birthday)} />
          <Field label="Geburtsname" value={u.birthName} />
          <Field label="Geburtsort und Land" value={u.birthPlace} />
          <Field label="Staatsangehörigkeit" value={u.nationality} />
          <Field label="Geschlecht" value={u.gender ? GENDER_LABELS[u.gender] : ''} />
          <Field label="Steuer-ID" value={u.taxId} />
          <Field label="Sozialversicherungs-Nr." value={u.socialSecurityNo} />
          <Field label="Bankverbindung / IBAN" value={u.iban} wide />
          <Field label="Krankenkasse" value={u.healthInsurance} />
          <Field label="Telefon" value={u.phone} />
          <Field label="E-Mail" value={u.email} wide />
        </div>

        {/* Angaben zur Beschäftigung */}
        <h2 className="text-[11px] font-bold uppercase tracking-wide text-white bg-gray-800 px-2 py-1 rounded-sm mb-3 print:bg-gray-800">
          Angaben zur Beschäftigung
        </h2>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
          <Field label="Personalnummer" value={u.personnelNumber} />
          <Field label="Tätigkeitsbezeichnung" value={u.jobTitle} />
          <Field label="Eintrittsdatum" value={d(u.entryDate)} />
          <Field label="Austrittsdatum" value={d(u.exitDate)} />
          <Field label="Wochenarbeitszeit" value={u.weeklyWorkTime} />
          <Field label="Brutto-Verdienst" value={u.grossSalary} />
          <Field label="Sonstige Gehaltsbestandteile" value={u.additionalSalaryComponents} />
          <Field label="Vertragliche Sonderzahlungen" value={u.specialPayments} />
          <Field label="Abrechnungs-Art" value={u.payrollType ? PAYROLL_LABELS[u.payrollType] : ''} />
          <Field label="Kurzfristig-Grenze" value={u.shortTermLimit} />
          <Field label="Freiwilliges Praktikum" value={u.voluntaryInternship ? 'Ja' : 'Nein'} />
          <Field label="Gesellschaftsanteile (%)" value={u.shareholderPercent} />
          <Field label="Weitere Beschäftigungen" value={u.otherEmployment ? OTHER_LABELS[u.otherEmployment] : ''} wide />
          <Field label="Urlaub jährlich (Tage)" value={u.vacationDaysAnnual} />
          <Field label="Urlaub lfd. Jahr (Tage)" value={u.vacationDaysProRata} />
        </div>

        {/* Unterschriften */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-10">
          <div className="border-t border-gray-400 pt-1 text-[10px] text-gray-500">Ort, Datum · Unterschrift Mitarbeiter</div>
          <div className="border-t border-gray-400 pt-1 text-[10px] text-gray-500">Ort, Datum · Unterschrift Arbeitgeber</div>
        </div>
      </div>
    </div>
  )
}
