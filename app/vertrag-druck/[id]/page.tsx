import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { getSession } from '@/app/actions/auth'
import { isAdmin } from '@/lib/session'
import DocumentSheet from '@/components/admin/DocumentSheet'
import {
  COMPANY, fullName, herrFrau, dLong, missingFields,
} from '@/lib/documents'

export const metadata = { title: 'Arbeitsvertrag (Druck)' }

type Props = { params: Promise<{ id: string }> }

// Abschnitts-Überschrift (röm. Ziffer + Titel)
function H({ no, children }: { no: string; children: React.ReactNode }) {
  return (
    <h2 className="font-bold mt-5 mb-1.5 break-after-avoid">
      {no}. {children}
    </h2>
  )
}
// Nummerierter Absatz innerhalb eines Abschnitts
function P({ n, children }: { n?: number; children: React.ReactNode }) {
  return (
    <p className="mb-1.5 break-inside-avoid">
      {n != null && <span className="mr-1">{n}.</span>}
      {children}
    </p>
  )
}

export default async function ArbeitsvertragPrintPage({ params }: Props) {
  const session = await getSession()
  if (!session || !isAdmin(session.role)) redirect('/login')

  const { id } = await params
  const u = await prisma.user.findUnique({
    where: { id },
    include: { primaryLocation: true },
  })
  if (!u) notFound()

  const name = fullName(u)
  const anschrift = [u.street, [u.postalCode, u.city].filter(Boolean).join(' ')].filter(Boolean).join(', ')
  const anrede = herrFrau(u.gender) // "Herr"/"Frau"/""
  const einsatzort = u.primaryLocation?.name
  const missing = missingFields(u, 'arbeitsvertrag')

  return (
    <DocumentSheet backHref={`/admin/employees/${u.id}/dokumente`} backLabel="← Zurück zu Dokumente">
      {missing.length > 0 && (
        <div className="no-print mb-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-[13px] text-amber-800">
          <strong>Unvollständige Daten:</strong> Folgende Felder fehlen im Personalbogen und
          erscheinen leer im Vertrag: {missing.join(', ')}.
        </div>
      )}

      {/* Adressblock / Parteien */}
      <h1 className="text-center text-base font-bold mb-6">Anstellungsvertrag</h1>

      <p className="mb-3">zwischen</p>
      <p className="mb-1">
        {[anrede, name].filter(Boolean).join(' ')}{anschrift ? `, ${anschrift}` : ''}
      </p>
      <p className="mb-3">– nachstehend „Angestellter" genannt –</p>
      <p className="mb-1">und</p>
      <p className="mb-1">
        {COMPANY.name}, {COMPANY.street}, {COMPANY.city}
      </p>
      <p className="mb-4">– nachstehend „Unternehmen" genannt –</p>
      <p className="mb-2">wird folgender Anstellungsvertrag geschlossen:</p>

      {/* I. Aufgabengebiet */}
      <H no="I">Aufgabengebiet und Zuständigkeit</H>
      <P n={1}>
        Der Angestellte wird ab {dLong(u.startDate) || '________'} als{' '}
        {u.jobTitle || '________'} eingestellt.
        {einsatzort ? ` Einsatzort ist der Betrieb „${einsatzort}".` : ''}
      </P>
      <P n={2}>
        Der Angestellte hat seine Aufgaben nach Maßgabe der Unternehmensrichtlinien und nach den
        Weisungen der Geschäftsführung wahrzunehmen. Er untersteht unmittelbar der Geschäftsführung.
      </P>
      <P n={3}>
        Das Unternehmen ist berechtigt, dem Angestellten auch eine andere, gleichwertige Tätigkeit zu
        übertragen – auch an einem anderen Ort –, die seinen Vorkenntnissen und Fähigkeiten entspricht
        und nicht mit einer Minderung des Arbeitsentgelts verbunden ist. Die Berechtigung erstreckt
        sich auch auf eine Beschäftigung in einem anderen Betrieb, an einem anderen Ort oder bei einer
        Tochtergesellschaft der Firma.
      </P>

      {/* II. Arbeitszeit */}
      <H no="II">Arbeitszeit</H>
      <P n={1}>
        Die Arbeit erfolgt im Rahmen von Arbeit auf Abruf. Der Angestellte wird nach betrieblichem
        Bedarf zum Einsatz abgerufen. Eine durchschnittliche Arbeitszeit von{' '}
        {u.weeklyWorkTime || '________'} dient als Planungsorientierung, begründet jedoch keinen
        Anspruch auf eine Mindestarbeitszeit oder ein Mindestentgelt. Vergütet werden ausschließlich
        die tatsächlich geleisteten Arbeitsstunden zum in Ziffer III vereinbarten Stundenlohn.
      </P>
      <P n={2}>
        Ab einer täglichen Arbeitszeit von sechs Stunden ist eine Pausenzeit von mindestens einer
        halben Stunde einzuhalten. Übersteigt die Arbeitszeit neun Stunden, erhöht sich die Pausenzeit
        auf mindestens 45 Minuten. Nach Beendigung der täglichen Arbeitszeit ist eine ununterbrochene
        Ruhezeit von mindestens elf Stunden einzuhalten.
      </P>
      <P n={3}>Der Arbeitnehmer ist zur täglichen Arbeitszeiterfassung verpflichtet.</P>

      {/* III. Vergütung */}
      <H no="III">Vergütung</H>
      <P n={1}>
        Als Vergütung für seine Tätigkeit erhält der Angestellte ein Bruttoentgelt von{' '}
        {u.grossSalary || '________'}, das jeweils zum Ende eines Monats fällig und auf ein vom
        Angestellten anzugebendes Konto überwiesen wird.
      </P>
      {u.additionalSalaryComponents && (
        <P n={2}>Sonstige Gehaltsbestandteile: {u.additionalSalaryComponents}.</P>
      )}
      {u.specialPayments && (
        <P n={u.additionalSalaryComponents ? 3 : 2}>
          Vertraglich festgelegte Sonderzahlungen: {u.specialPayments}.
        </P>
      )}

      {/* IV. Nebentätigkeit */}
      <H no="IV">Nebentätigkeit</H>
      <P n={1}>
        Dem Angestellten ist die Übernahme einer Nebentätigkeit, die den Interessen des Unternehmens
        zuwiderläuft oder seine Arbeitskraft beeinträchtigt, untersagt. Die Geschäftsführung ist vor
        Aufnahme einer Nebentätigkeit in Textform zu unterrichten; sie bedarf grundsätzlich der
        Zustimmung des Unternehmens.
      </P>

      {/* V. Urlaub */}
      <H no="V">Urlaub</H>
      <P n={1}>
        Bei einer Vollzeitbeschäftigung mit einer 5-Tage-Woche beträgt der Urlaubsanspruch{' '}
        {COMPANY.vollzeitUrlaubstage} Arbeitstage pro Kalenderjahr.
      </P>
      <P n={2}>
        Da die Tätigkeit im Rahmen von Arbeit auf Abruf erfolgt, berechnet sich der tatsächliche
        Urlaubsanspruch anteilig entsprechend dem Umfang der Beschäftigung (durchschnittliche
        Arbeitstage pro Woche). Der gesetzliche Mindesturlaub bleibt in jedem Fall gewahrt.
      </P>
      <P n={3}>
        Bei Beendigung des Arbeitsverhältnisses sind verbleibende Urlaubsansprüche innerhalb der
        Kündigungsfrist abzubauen, soweit dies möglich ist. Im Übrigen richtet sich die Behandlung des
        Urlaubs nach den gesetzlichen Bestimmungen. Urlaubsanträge sind von der Geschäftsführung zu
        genehmigen.
      </P>

      {/* VI. Krankheit */}
      <H no="VI">Krankheit</H>
      <P n={1}>
        Die Entgeltfortzahlung im Krankheitsfall richtet sich nach den gesetzlichen Bestimmungen. Die
        Arbeitsverhinderung ist dem Arbeitgeber unverzüglich mitzuteilen. Dauert die
        Arbeitsunfähigkeit länger als drei Kalendertage, hat der Angestellte die Arbeitsunfähigkeit
        ärztlich feststellen zu lassen. Der Arbeitgeber ist berechtigt, die Feststellung früher zu
        verlangen.
      </P>

      {/* VII. Verschwiegenheit */}
      <H no="VII">Verschwiegenheitspflicht</H>
      <P n={1}>
        Der Arbeitnehmer verpflichtet sich, über alle Betriebs- und Geschäftsgeheimnisse sowie über
        sonstige vertrauliche betriebliche Angelegenheiten Stillschweigen zu bewahren und diese keinem
        Dritten zugänglich zu machen. Die Verpflichtung besteht auch nach Beendigung des
        Anstellungsvertrages fort.
      </P>

      {/* VIII. Schutzrechte */}
      <H no="VIII">Schutzrechte</H>
      <P n={1}>
        Die Nutzungs- und Verwertungsrechte an nach Urheber-, Marken-, Geschmacksmuster- oder
        Gebrauchsmusterrecht schutzfähigen Arbeitsergebnissen aus der Tätigkeit nach diesem Vertrag
        gehen mit deren Entstehung uneingeschränkt auf das Unternehmen über; dies gilt auch für die
        Zeit nach Beendigung des Vertrages.
      </P>

      {/* IX. Dauer / Kündigung */}
      <H no="IX">Dauer des Vertrages, Kündigung</H>
      <P n={1}>
        Die Beendigung des Arbeitsverhältnisses durch Kündigung oder Aufhebungsvertrag bedarf für ihre
        Wirksamkeit der Schriftform; die elektronische Form ist ausgeschlossen.
      </P>
      <P n={2}>
        Die ersten sechs Monate des Anstellungsverhältnisses gelten als Probezeit, während der beide
        Vertragspartner das Anstellungsverhältnis mit einer Kündigungsfrist von zwei Wochen beenden
        können.
      </P>
      <P n={3}>
        Nach Ablauf der Probezeit finden die gesetzlichen Kündigungsfristen (§ 622 BGB) Anwendung.
        Jede gesetzliche Verlängerung der Kündigungsfrist zugunsten des Angestellten gilt in gleicher
        Weise auch zugunsten des Arbeitgebers.
      </P>
      <P n={4}>
        Das Arbeitsverhältnis endet ohne Kündigung spätestens mit Ablauf des Monats, in dem der
        Angestellte das gesetzlich festgelegte Renteneintrittsalter vollendet hat.
      </P>

      {/* X. Verfallfristen */}
      <H no="X">Verfall-/Ausschlussfristen</H>
      <P n={1}>
        Ansprüche aus dem Anstellungsverhältnis sind innerhalb von drei Monaten nach ihrer Fälligkeit
        in Textform geltend zu machen. Ansprüche, die nicht innerhalb dieser Frist geltend gemacht
        werden, sind verfallen. Dies gilt nicht, soweit ein Anspruch auf Vorsatz oder grober
        Fahrlässigkeit beruht oder den gesetzlichen Mindestlohn betrifft.
      </P>

      {/* XI. Bild- und Tonaufnahmen, Datenschutz */}
      <H no="XI">Bild- und Tonaufnahmen, Datenschutz</H>
      <P n={1}>
        Der Arbeitnehmer willigt ein, dass der Arbeitgeber Bild- und Tonaufnahmen seiner Person, die im
        Rahmen der Tätigkeit entstehen, für Zwecke der Unternehmenskommunikation (z. B. Website,
        Social-Media-Kanäle, Printmedien) unentgeltlich nutzen darf. Die Einwilligung erfolgt freiwillig
        und kann jederzeit mit Wirkung für die Zukunft widerrufen werden.
      </P>
      <P n={2}>
        Der Arbeitnehmer erteilt die Erlaubnis, dass seine Daten, solange sie für die Planung,
        Abrechnung und Kommunikation nötig sind, elektronisch verarbeitet und gespeichert werden.
      </P>
      <P n={3}>
        Sofern es gesetzlich vorgeschrieben ist, werden diese Daten auch nach seinem Ausscheiden
        digital aufbewahrt (z. B. zum Nachweis der Arbeitszeiten).
      </P>

      {/* XII. Schlussbestimmungen */}
      <H no="XII">Schlussbestimmungen</H>
      <P n={1}>
        Stillschweigende, mündliche oder schriftliche Nebenabreden wurden nicht getroffen. Änderungen
        und Ergänzungen dieses Vertrages bedürfen der Textform; dies gilt auch für die Aufhebung dieser
        Klausel.
      </P>
      <P n={2}>
        Sollten einzelne Bestimmungen dieses Vertrages unwirksam sein oder werden, wird hierdurch die
        Wirksamkeit des Vertrages im Übrigen nicht berührt.
      </P>
      <P n={3}>
        Der Arbeitnehmer verpflichtet sich, dem Arbeitgeber Veränderungen der persönlichen Verhältnisse
        (Familienstand, Kinderzahl, Adresse) unverzüglich mitzuteilen.
      </P>

      {/* Unterschriften */}
      <div className="mt-12 break-inside-avoid">
        <p className="mb-10">Hamburg, den ____________________</p>
        <div className="flex justify-between gap-12">
          <div className="flex-1">
            <div className="border-t border-black pt-1 text-[11px]">
              Unterschrift Geschäftsführung
              <br />
              {COMPANY.managingDirector}
            </div>
          </div>
          <div className="flex-1">
            <div className="border-t border-black pt-1 text-[11px]">
              Unterschrift Angestellter
              <br />
              {name}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-10 pt-3 border-t border-gray-300 text-[9px] text-gray-500 text-center leading-snug">
        {COMPANY.footerLines.map((l) => (
          <div key={l}>{l}</div>
        ))}
      </div>
    </DocumentSheet>
  )
}
