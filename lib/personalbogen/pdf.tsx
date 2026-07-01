import { format } from 'date-fns'
import {
  Document, Page, View, Text, StyleSheet, renderToBuffer,
} from '@react-pdf/renderer'
import type { User } from '@/app/generated/prisma/client'
import { COMPANY_NAME } from '@/lib/company'

const d = (v: Date | null) => (v ? format(v, 'dd.MM.yyyy') : '')
const has = (s: string | null | undefined, needle: string) =>
  !!s && s.toLowerCase().includes(needle.toLowerCase())

const BLACK = '#000'
const styles = StyleSheet.create({
  page: { paddingVertical: 24, paddingHorizontal: 28, fontSize: 9, fontFamily: 'Helvetica', color: '#111' },
  titleWrap: { textAlign: 'center', marginBottom: 10 },
  title: { fontSize: 14, fontFamily: 'Helvetica-Bold', textDecoration: 'underline' },
  subtitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', marginTop: 2 },
  table: { borderTop: `0.5pt solid ${BLACK}`, borderLeft: `0.5pt solid ${BLACK}` },
  row: { flexDirection: 'row', borderBottom: `0.5pt solid ${BLACK}` },
  labelCell: { width: '38%', borderRight: `0.5pt solid ${BLACK}`, paddingHorizontal: 4, paddingVertical: 3 },
  valueCell: { width: '62%', borderRight: `0.5pt solid ${BLACK}`, paddingHorizontal: 4, paddingVertical: 3 },
  label: { fontSize: 9, lineHeight: 1.2 },
  hint: { fontSize: 6.5, color: '#666', lineHeight: 1.1 },
  value: { fontSize: 9 },
  sectionRow: {
    flexDirection: 'row', borderBottom: `0.5pt solid ${BLACK}`, borderRight: `0.5pt solid ${BLACK}`,
    backgroundColor: '#e5e7eb', paddingHorizontal: 4, paddingVertical: 3,
  },
  sectionText: { fontSize: 9, fontFamily: 'Helvetica-Bold', textDecoration: 'underline' },
  boxRow: { flexDirection: 'row', alignItems: 'center', marginRight: 12, marginBottom: 2 },
  box: { width: 9, height: 9, border: `0.7pt solid ${BLACK}`, marginRight: 3, alignItems: 'center', justifyContent: 'center' },
  boxTick: { fontSize: 7, fontFamily: 'Helvetica-Bold', lineHeight: 1 },
  boxLabel: { fontSize: 8 },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap' },
})

function Box({ checked, children }: { checked?: boolean; children: string }) {
  return (
    <View style={styles.boxRow}>
      <View style={styles.box}>{checked ? <Text style={styles.boxTick}>X</Text> : null}</View>
      <Text style={styles.boxLabel}>{children}</Text>
    </View>
  )
}

function Row({
  label, hint, value, children,
}: {
  label: string
  hint?: string
  value?: string | number | null
  children?: React.ReactNode
}) {
  const v = value === 0 ? '0' : value ? String(value) : ''
  return (
    <View style={styles.row} wrap={false}>
      <View style={styles.labelCell}>
        <Text style={styles.label}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      <View style={styles.valueCell}>
        {children ?? <Text style={styles.value}>{v}</Text>}
      </View>
    </View>
  )
}

function Section({ title }: { title: string }) {
  return (
    <View style={styles.sectionRow} wrap={false}>
      <Text style={styles.sectionText}>{title}</Text>
    </View>
  )
}

function EinstellungsbogenDoc({ u }: { u: User }) {
  const plzOrt = [u.postalCode, u.city].filter(Boolean).join(' ')
  const p = u.payrollType
  const o = u.otherEmployment

  return (
    <Document title={`Einstellungsbogen ${[u.firstName, u.lastName].filter(Boolean).join(' ') || u.name}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.titleWrap}>
          <Text style={styles.title}>Mitarbeiter-Einstellungsbogen</Text>
          <Text style={styles.subtitle}>(Bitte leserlich ausfüllen!)</Text>
        </View>

        <View style={styles.table}>
          <Row label="Firmenname" value={COMPANY_NAME} />

          <Section title="Angaben zum Mitarbeiter" />
          <Row label="Name" value={u.lastName || u.name} />
          <Row label="Vorname" value={u.firstName} />
          <Row label="Strasse und Hausnummer" value={u.street} />
          <Row label="Plz, Ort" value={plzOrt} />
          <Row label="Staatsangehörigkeit" value={u.nationality} />
          <Row label="Geburtsdatum" value={d(u.birthday)} />
          <Row label="Geburtsname (falls abweichend)" value={u.birthName} />
          <Row label="Geburtsort und Land" value={u.birthPlace} />
          <Row label="Geschlecht (bitte ankreuzen)">
            <View style={styles.wrapRow}>
              <Box checked={u.gender === 'MALE'}>männlich</Box>
              <Box checked={u.gender === 'FEMALE'}>weiblich</Box>
              <Box checked={u.gender === 'DIVERSE'}>divers</Box>
            </View>
          </Row>
          <Row label="persönliche Steuer-Identifikationsnummer (11-stellig)" value={u.taxId} />
          <Row label="Sozialversicherungs-Nr. (12-stellig)" value={u.socialSecurityNo} />
          <Row label="Bankverbindung / IBAN" value={u.iban} />
          <Row label="Krankenkasse" value={u.healthInsurance} />

          <Section title="Angaben zur Beschäftigung" />
          <Row label="Personalnummer" value={u.personnelNumber} />
          <Row label="Eintritt" value={d(u.startDate)} />
          <Row label="Austritt (falls bekannt)" value={d(u.endDate)} />
          <Row label="genaue Tätigkeitsbezeichnung" value={u.jobTitle} />
          <Row label="Wochenarbeitszeit in Stunden und Tagen" value={u.weeklyWorkTime} />
          <Row label="Brutto-Verdienst" hint="(Lohn/Gehalt oder Stundenlohn)" value={u.grossSalary} />
          <Row label="Sonstige Gehaltsbestandteile" hint="(VWL/Firmenwagen etc.)" value={u.additionalSalaryComponents} />
          <Row label="Vertraglich festgelegte Sonderzahlungen" hint="(Weihnachtsgeld / Urlaubsgeld / Boni)" value={u.specialPayments} />
          <Row label="Abrechnungs-Art (bitte ankreuzen)">
            <View>
              <View style={styles.wrapRow}>
                <View style={{ width: '40%' }}><Box checked={p === 'SV_PFLICHTIG'}>Sozialversicherungspflichtig</Box></View>
                <View style={{ width: '32%' }}><Box checked={p === 'KURZFRISTIG'}>Kurzfristige Beschäftigung</Box></View>
                <View style={styles.wrapRow}>
                  <Box checked={p === 'KURZFRISTIG' && has(u.shortTermLimit, '3')}>3 Monate</Box>
                  <Box checked={p === 'KURZFRISTIG' && has(u.shortTermLimit, '70')}>70 Tage</Box>
                </View>
              </View>
              <View style={styles.wrapRow}>
                <View style={{ width: '40%' }}><Box checked={p === 'AUSZUBILDENDER'}>Auszubildender</Box></View>
                <View style={{ width: '32%' }}><Box checked={p === 'PFLICHTPRAKTIKUM'}>Pflichtpraktikum</Box></View>
                <Box checked={!!u.voluntaryInternship}>freiwilliges Praktikum</Box>
              </View>
              <View style={styles.wrapRow}>
                <View style={{ width: '40%' }}><Box checked={p === 'MINIJOBBER'}>Minijobber</Box></View>
                <View style={{ width: '32%' }}><Box checked={p === 'GESCHAEFTSFUEHRER'}>Geschäftsführer</Box></View>
                <Text style={styles.boxLabel}>Gesellschaftsanteile in %: {u.shareholderPercent || '____'}</Text>
              </View>
              <View style={styles.wrapRow}>
                <View style={{ width: '40%' }}><Box checked={p === 'WERKSTUDENT'}>Werkstudent</Box></View>
                <View style={{ width: '32%' }}><Box checked={p === 'SONSTIGES'}>Sonstiges</Box></View>
              </View>
            </View>
          </Row>
          <Row label="Werden weitere Beschäftigungen ausgeübt?" hint="(bitte ankreuzen)">
            <View style={styles.wrapRow}>
              <Box checked={o.includes('NEIN')}>Nein</Box>
              <Box checked={o.includes('JA_SV_PFLICHTIG')}>Ja, Sv-Pflichtig</Box>
              <Box checked={o.includes('JA_MINIJOB')}>Ja, Minijob</Box>
              <Box checked={o.includes('JA_KURZFRISTIG')}>Ja, kurzfristige Beschäftigung</Box>
              <Box checked={o.includes('JA_SELBSTSTAENDIG')}>Ja, Selbstständigkeit</Box>
            </View>
          </Row>
          <Row
            label="Urlaubsanspruch in Tagen: Jährlich / lfd. Jahr (anteilig)"
            value={[u.vacationDaysPerYear, u.vacationDaysProRata].some((x) => x != null)
              ? `${u.vacationDaysPerYear ?? '–'} / ${u.vacationDaysProRata ?? '–'}`
              : ''}
          />

          <Section title="Besonderheiten in der Sozialversicherung" />
          <Row label="Haben Sie Kinder?" hint='Wenn ja, bitte das Formular "Nachweis Elternschaft" ausfüllen'>
            <View style={styles.wrapRow}><Box>Ja</Box><Box>Nein</Box></View>
          </Row>
          <Row label="Übergangsbereich für Sv-pflichtige Beschäftigungen">
            <View style={styles.wrapRow}><Box>Ja</Box><Box>Nein</Box></View>
          </Row>
          <Row label="RV-Befreiung für geringfügig Beschäftigt (Minijobber)">
            <View>
              <Box>Ja, der Mitarbeiter möchte befreit werden (Antrag ausfüllen)</Box>
              <Box>Nein, Mitarbeiter zahlt RV-Beiträge</Box>
            </View>
          </Row>
          <Row label="Status Feststellungsverfahren">
            <View>
              <Box>keine Abhängigkeit zwischen Arbeitgeber und Arbeitnehmer</Box>
              <Box>Ehegatte / Lebenspartner / Abkömmling</Box>
              <Box>Geschäftsführender GmbH-Gesellschafter</Box>
            </View>
          </Row>

          <Section title="Lohnsteuermerkmale oder Pauschalversteuerung" />
          <Row label="Steuerklasse" value="" />
          <Row label="Kinderfreibeträge" value="" />
          <Row label="Konfession" value="" />
          <Row label="Pauschalversteuerung (für Minijobber)">
            <View style={styles.wrapRow}><Box>2% - Kosten trägt AG</Box><Box>2% - Kosten trägt AN</Box></View>
          </Row>
          <Row label="Pauschalversteuerung (für Kurzfristige Beschäftigungen)">
            <View style={styles.wrapRow}><Box>25% - Kosten trägt AG</Box><Box>25% - Kosten trägt AN</Box></View>
          </Row>
          <Row label="Bemerkungen" value="" />
        </View>
      </Page>
    </Document>
  )
}

/** Einstellungsbogen als PDF (Buffer), Layout wie die Druckansicht. */
export async function personalbogenPdf(u: User): Promise<Buffer> {
  return renderToBuffer(<EinstellungsbogenDoc u={u} />)
}
