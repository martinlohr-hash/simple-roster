import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { prisma } from '@/lib/db'
import { getSession } from '@/app/actions/auth'
import { isAdmin } from '@/lib/session'
import { COMPANY_NAME } from '@/lib/company'
import PrintButton from '@/components/admin/PrintButton'

export const metadata = { title: 'Einstellungsbogen (Druck)' }

const d = (v: Date | null) => (v ? format(v, 'dd.MM.yyyy') : '')
const has = (s: string | null | undefined, needle: string) =>
  !!s && s.toLowerCase().includes(needle.toLowerCase())

// Ankreuzkästchen (gefüllt = automatisch aus den gespeicherten Daten gesetzt).
function Box({ checked, children }: { checked?: boolean; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 mr-4 align-top">
      <span className="inline-flex items-center justify-center w-3.5 h-3.5 border border-black text-[10px] leading-none shrink-0">
        {checked ? '✕' : ''}
      </span>
      <span className="text-[11px] text-gray-900">{children}</span>
    </span>
  )
}

// Formularzeile: Label-Spalte links, Wert/Ankreuzfeld rechts.
function Row({
  label,
  hint,
  value,
  children,
  minH = 22,
}: {
  label: string
  hint?: string
  value?: string | number | null
  children?: React.ReactNode
  minH?: number
}) {
  const v = value === 0 ? '0' : value ? String(value) : ''
  return (
    <tr className="break-inside-avoid">
      <td className="border border-black align-top px-2 py-1 w-[38%]">
        <div className="text-[12px] text-gray-900 leading-snug">{label}</div>
        {hint && <div className="text-[9px] text-gray-500 leading-tight">{hint}</div>}
      </td>
      <td className="border border-black align-top px-2 py-1" style={{ minHeight: minH }}>
        {children ?? <span className="text-[12px] text-gray-900">{v}</span>}
      </td>
    </tr>
  )
}

function SectionRow({ title }: { title: string }) {
  return (
    <tr className="break-inside-avoid">
      <td colSpan={2} className="border border-black bg-gray-200 px-2 py-1">
        <span className="text-[12px] font-bold underline text-gray-900">{title}</span>
      </td>
    </tr>
  )
}

type Props = { params: Promise<{ id: string }> }

export default async function EinstellungsbogenPrintPage({ params }: Props) {
  const session = await getSession()
  if (!session || !isAdmin(session.role)) redirect('/login')

  const { id } = await params
  const u = await prisma.user.findUnique({ where: { id } })
  if (!u) notFound()

  const plzOrt = [u.postalCode, u.city].filter(Boolean).join(' ')
  const p = u.payrollType
  const o = u.otherEmployment

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white">
      <style>{`
        @page { size: A4 portrait; margin: 10mm; }
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        @media print {
          .no-print { display: none !important; }
          .sheet { box-shadow: none !important; margin: 0 !important; width: auto !important; max-width: none !important; }
          html, body { background: #fff !important; }
        }
      `}</style>

      {/* Aktionsleiste – nicht im Druck */}
      <div className="no-print sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="max-w-[840px] mx-auto px-4 py-3 flex items-center justify-between">
          <Link href={`/admin/employees/${u.id}/personalbogen`} className="text-sm text-gray-500 hover:text-gray-900">
            ← Zurück zum Bogen
          </Link>
          <PrintButton />
        </div>
      </div>

      <div className="sheet bg-white max-w-[840px] mx-auto my-6 p-8 shadow-sm print:my-0 print:p-0 print:shadow-none">
        <div className="text-center mb-4">
          <h1 className="text-lg font-bold underline text-gray-900">Mitarbeiter-Einstellungsbogen</h1>
          <p className="text-[12px] font-bold text-gray-800">(Bitte leserlich ausfüllen!)</p>
        </div>

        <table className="w-full border-collapse">
          <tbody>
            {/* Firmenname */}
            <Row label="Firmenname" value={COMPANY_NAME} />

            {/* Angaben zum Mitarbeiter */}
            <SectionRow title="Angaben zum Mitarbeiter" />
            <Row label="Name" value={u.lastName || u.name} />
            <Row label="Vorname" value={u.firstName} />
            <Row label="Strasse und Hausnummer" value={u.street} />
            <Row label="Plz, Ort" value={plzOrt} />
            <Row label="Staatsangehörigkeit" value={u.nationality} />
            <Row label="Geburtsdatum" value={d(u.birthday)} />
            <Row label="Geburtsname (falls abweichend)" value={u.birthName} />
            <Row label="Geburtsort und Land" value={u.birthPlace} />
            <Row label="Geschlecht (bitte ankreuzen)">
              <Box checked={u.gender === 'MALE'}>männlich</Box>
              <Box checked={u.gender === 'FEMALE'}>weiblich</Box>
              <Box checked={u.gender === 'DIVERSE'}>divers</Box>
            </Row>
            <Row label="persönliche Steuer-Identifikationsnummer (11-stellig)" value={u.taxId} />
            <Row label="Sozialversicherungs-Nr. (12-stellig)" value={u.socialSecurityNo} />
            <Row label="Bankverbindung / IBAN" value={u.iban} />
            <Row label="Krankenkasse" value={u.healthInsurance} />

            {/* Angaben zur Beschäftigung */}
            <SectionRow title="Angaben zur Beschäftigung" />
            <Row label="Personalnummer" value={u.personnelNumber} />
            <Row label="Eintritt" value={d(u.entryDate)} />
            <Row label="Austritt (falls bekannt)" value={d(u.exitDate)} />
            <Row label="genaue Tätigkeitsbezeichnung" value={u.jobTitle} />
            <Row label="Wochenarbeitszeit in Stunden und Tagen" value={u.weeklyWorkTime} />
            <Row label="Brutto-Verdienst" hint="(Lohn/Gehalt oder Stundenlohn)" value={u.grossSalary} />
            <Row label="Sonstige Gehaltsbestandteile" hint="(VWL/Firmenwagen etc.)" value={u.additionalSalaryComponents} />
            <Row label="Vertraglich festgelegte Sonderzahlungen" hint="(Weihnachtsgeld / Urlaubsgeld / Boni)" value={u.specialPayments} />
            <Row label="Abrechnungs-Art (bitte ankreuzen)" minH={90}>
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-start">
                  <span className="inline-flex w-[34%] min-w-[150px]"><Box checked={p === 'SV_PFLICHTIG'}>Sozialversicherungspflichtig</Box></span>
                  <span className="inline-flex w-[32%] min-w-[140px]"><Box checked={p === 'KURZFRISTIG'}>Kurzfristige Beschäftigung</Box></span>
                  <span className="inline-flex">
                    <Box checked={p === 'KURZFRISTIG' && has(u.shortTermLimit, '3')}>3 Monate</Box>
                    <Box checked={p === 'KURZFRISTIG' && has(u.shortTermLimit, '70')}>70 Tage</Box>
                  </span>
                </div>
                <div className="flex flex-wrap items-start">
                  <span className="inline-flex w-[34%] min-w-[150px]"><Box checked={p === 'AUSZUBILDENDER'}>Auszubildender</Box></span>
                  <span className="inline-flex w-[32%] min-w-[140px]"><Box checked={p === 'PFLICHTPRAKTIKUM'}>Pflichtpraktikum</Box></span>
                  <span className="inline-flex"><Box checked={u.voluntaryInternship}>freiwilliges Praktikum</Box></span>
                </div>
                <div className="flex flex-wrap items-start">
                  <span className="inline-flex w-[34%] min-w-[150px]"><Box checked={p === 'MINIJOBBER'}>Minijobber</Box></span>
                  <span className="inline-flex w-[32%] min-w-[140px]"><Box checked={p === 'GESCHAEFTSFUEHRER'}>Geschäftsführer</Box></span>
                  <span className="inline-flex items-center text-[11px] text-gray-900">
                    Gesellschaftsanteile in %:&nbsp;<span className="border-b border-black min-w-[60px] inline-block">{u.shareholderPercent || ''}</span>
                  </span>
                </div>
                <div className="flex flex-wrap items-start">
                  <span className="inline-flex w-[34%] min-w-[150px]"><Box checked={p === 'WERKSTUDENT'}>Werkstudent</Box></span>
                  <span className="inline-flex w-[32%] min-w-[140px]"><Box checked={p === 'SONSTIGES'}>Sonstiges</Box></span>
                </div>
              </div>
            </Row>
            <Row label="Werden weitere Beschäftigungen ausgeübt?" hint="(bitte ankreuzen)" minH={40}>
              <div className="flex flex-wrap">
                <Box checked={o.includes('NEIN')}>Nein</Box>
                <Box checked={o.includes('JA_SV_PFLICHTIG')}>Ja, Sv-Pflichtig</Box>
                <Box checked={o.includes('JA_MINIJOB')}>Ja, Minijob</Box>
                <Box checked={o.includes('JA_KURZFRISTIG')}>Ja, kurzfristige Beschäftigung</Box>
                <Box checked={o.includes('JA_SELBSTSTAENDIG')}>Ja, Selbstständigkeit</Box>
              </div>
            </Row>
            <Row
              label="Urlaubsanspruch in Tagen: Jährlich / lfd. Jahr (anteilig)"
              value={[u.vacationDaysAnnual, u.vacationDaysProRata].some((x) => x != null)
                ? `${u.vacationDaysAnnual ?? '–'} / ${u.vacationDaysProRata ?? '–'}`
                : ''}
            />

            {/* Besonderheiten in der Sozialversicherung (im System nicht erfasst → leer zum Ausfüllen) */}
            <SectionRow title="Besonderheiten in der Sozialversicherung" />
            <Row label="Haben Sie Kinder?" hint='Wenn ja, bitte das Formular "Nachweis Elternschaft" ausfüllen'>
              <Box>Ja</Box><Box>Nein</Box>
            </Row>
            <Row label="Übergangsbereich für Sv-pflichtige Beschäftigungen">
              <Box>Ja</Box><Box>Nein</Box>
            </Row>
            <Row label="RV-Befreiung für geringfügig Beschäftigt (Minijobber)">
              <Box>Ja, der Mitarbeiter möchte befreit werden (Antrag ausfüllen)</Box>
              <Box>Nein, Mitarbeiter zahlt RV-Beiträge</Box>
            </Row>
            <Row label="Status Feststellungsverfahren" minH={40}>
              <div className="flex flex-col gap-1">
                <Box>keine Abhängigkeit zwischen Arbeitgeber und Arbeitnehmer</Box>
                <Box>Ehegatte / Lebenspartner / Abkömmling</Box>
                <Box>Geschäftsführender GmbH-Gesellschafter</Box>
              </div>
            </Row>

            {/* Lohnsteuermerkmale (im System nicht erfasst → leer zum Ausfüllen) */}
            <SectionRow title="Lohnsteuermerkmale oder Pauschalversteuerung" />
            <Row label="Steuerklasse" />
            <Row label="Kinderfreibeträge" />
            <Row label="Konfession" />
            <Row label="Pauschalversteuerung (für Minijobber)">
              <Box>2% - Kosten trägt AG</Box><Box>2% - Kosten trägt AN</Box>
            </Row>
            <Row label="Pauschalversteuerung (für Kurzfristige Beschäftigungen)">
              <Box>25% - Kosten trägt AG</Box><Box>25% - Kosten trägt AN</Box>
            </Row>
            <Row label="Bemerkungen" minH={70} />
          </tbody>
        </table>
      </div>
    </div>
  )
}
