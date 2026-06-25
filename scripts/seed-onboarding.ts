import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../app/generated/prisma/client'

const adapter = new PrismaPg(process.env.DATABASE_URL!)
const prisma = new PrismaClient({ adapter })

// Platzhalter-Sequenz: Willkommen (Tag 0) + 5 Folgetage. Texte sind bewusst
// generisch gehalten – im Admin-Bereich /admin/onboarding überschreiben.
const STEPS = [
  {
    delayDays: 0,
    order: 0,
    subject: 'Willkommen im Team, {{vorname}}! 🎉',
    body: [
      'Hallo {{vorname}},',
      '',
      'herzlich willkommen bei **{{firma}}**! Wir freuen uns sehr, dass du an Bord bist.',
      '',
      'In den nächsten Tagen bekommst du von uns jeden Tag eine kurze Mail mit allem, was du für einen guten Start brauchst: Rezepte, Abläufe, kleine Wissenshäppchen und nützliche Links.',
      '',
      'Dein Dienstplan und deine Stunden findest du jederzeit hier:',
    ].join('\n'),
    ctaLabel: 'Zum Dienstplan',
    ctaUrl: '{{dashboard}}',
    active: true,
  },
  {
    delayDays: 1,
    order: 0,
    subject: 'Tag 1: Unsere wichtigsten Abläufe',
    body: [
      'Hallo {{vorname}},',
      '',
      'heute geht es um die Basics für deinen Arbeitsalltag:',
      '',
      '- Ein- und Ausstempeln machst du direkt über dein Dashboard',
      '- Schichten siehst du immer eine Woche im Voraus',
      '- Urlaub und Verfügbarkeit trägst du selbst in deinem Profil ein',
      '',
      'Schau dich ruhig einmal in Ruhe um – bei Fragen ist immer jemand für dich da.',
    ].join('\n'),
    ctaLabel: null,
    ctaUrl: null,
    active: true,
  },
  {
    delayDays: 2,
    order: 0,
    subject: 'Tag 2: Unser erstes Rezept 🥪',
    body: [
      'Hallo {{vorname}},',
      '',
      'Qualität entsteht in der Zubereitung. Heute ein Klassiker aus unserer Karte:',
      '',
      '**Platzhalter-Rezept**',
      '',
      '- Zutat 1',
      '- Zutat 2',
      '- Zutat 3',
      '',
      'Zubereitung: Hier kommt später die Schritt-für-Schritt-Anleitung rein.',
    ].join('\n'),
    ctaLabel: null,
    ctaUrl: null,
    active: true,
  },
  {
    delayDays: 3,
    order: 0,
    subject: 'Tag 3: Gut zu wissen',
    body: [
      'Hallo {{vorname}},',
      '',
      'ein paar Dinge, die im Alltag oft gefragt werden – Platzhalter, hier später ergänzen:',
      '',
      '- Pausenregelung',
      '- Hygiene & Sauberkeit',
      '- Umgang mit Gästen',
    ].join('\n'),
    ctaLabel: null,
    ctaUrl: null,
    active: true,
  },
  {
    delayDays: 4,
    order: 0,
    subject: 'Tag 4: Noch ein Rezept 🥗',
    body: [
      'Hallo {{vorname}},',
      '',
      'weiter geht es mit einem weiteren Klassiker. (Platzhalter – Rezept später einsetzen.)',
    ].join('\n'),
    ctaLabel: null,
    ctaUrl: null,
    active: true,
  },
  {
    delayDays: 5,
    order: 0,
    subject: 'Tag 5: Du bist startklar! 🚀',
    body: [
      'Hallo {{vorname}},',
      '',
      'das war unsere kleine Onboarding-Serie. Du hast jetzt alles, was du für einen guten Start brauchst.',
      '',
      'Wir freuen uns auf die Zusammenarbeit mit dir!',
      '',
      'Dein Team von {{firma}}',
    ].join('\n'),
    ctaLabel: 'Zum Dienstplan',
    ctaUrl: '{{dashboard}}',
    active: true,
  },
]

async function main() {
  const existing = await prisma.onboardingStep.count()
  if (existing > 0) {
    console.log(`Es gibt bereits ${existing} Onboarding-Stufen – Seed übersprungen.`)
    return
  }
  await prisma.onboardingStep.createMany({ data: STEPS })
  console.log(`${STEPS.length} Platzhalter-Stufen angelegt.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => process.exit())
