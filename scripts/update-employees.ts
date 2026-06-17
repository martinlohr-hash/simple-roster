import 'dotenv/config'
import { PrismaClient } from '../app/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const updates = [
  {
    email: 'anton.schuppli@simple-roster.de',
    phone: '017670090707',
    address: 'Isestraße 83, 20149 Hamburg',
    birthday: new Date('2026-04-03'),
    startDate: new Date('2026-05-05'),
  },
  {
    email: 'dariia.ielisavenko@simple-roster.de',
    phone: '015205733855',
    address: 'Gorch-Fock-Straße 1, 20357 Hamburg',
    birthday: new Date('2009-09-18'),
    startDate: new Date('2026-03-16'),
  },
  {
    email: 'mia.westphalen@simple-roster.de',
    phone: '017642004116',
    address: 'Gorch-Fock-Straße 3, 20357 Hamburg',
    birthday: new Date('2006-10-25'),
    startDate: new Date('2025-11-23'),
  },
  {
    email: 'mila.stinsmeier@simple-roster.de',
    phone: '01789005211',
    address: 'Bogenstraße 13, 20144 Hamburg',
    birthday: new Date('2010-05-12'),
    startDate: new Date('2026-03-16'),
  },
  {
    email: 'olivia.shoesmith@simple-roster.de',
    phone: '015208934870',
    address: 'Oeverseestraße 1, 22769 Hamburg',
    birthday: new Date('2025-08-04'),
    startDate: new Date('2025-11-05'),
  },
  {
    email: 'stephan@asimple.world',
    phone: '0163-333 99 25',
    address: 'Weidenallee, 20357 Hamburg',
    birthday: new Date('2011-01-01'),
    startDate: new Date('2025-10-01'),
  },
  {
    email: 'm.lohr@me.com',
    startDate: new Date('2025-01-01'),
  },
]

async function main() {
  for (const u of updates) {
    const { email, ...data } = u
    const updated = await prisma.user.updateMany({
      where: { email },
      data,
    })
    console.log(`${email}: ${updated.count} row(s) updated`)
  }
  await prisma.$disconnect()
}

main().catch((e) => { console.error(e); process.exit(1) })
