import 'dotenv/config'
import { PrismaClient } from '../app/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

const adapter = new PrismaPg(process.env.DATABASE_URL!)
const prisma = new PrismaClient({ adapter })

async function main() {
  const [locA, locB] = await Promise.all([
    prisma.location.upsert({
      where: { id: 'loc-a' },
      update: {},
      create: { id: 'loc-a', name: 'Standort A', color: '#3B82F6' },
    }),
    prisma.location.upsert({
      where: { id: 'loc-b' },
      update: {},
      create: { id: 'loc-b', name: 'Standort B', color: '#8B5CF6' },
    }),
  ])

  const adminHash = await bcrypt.hash('admin1234', 10)
  await prisma.user.upsert({
    where: { email: 'admin@simple-roster.de' },
    update: {},
    create: {
      name: 'Admin',
      email: 'admin@simple-roster.de',
      passwordHash: adminHash,
      role: 'ADMIN',
      hourlyRate: 0,
      overheadPercent: 0,
    },
  })

  const pw = await bcrypt.hash('test1234', 10)
  const employees = [
    { name: 'Anna Müller', email: 'anna@simple-roster.de', hourlyRate: 14.5, overheadPercent: 22, maxHoursWeek: 40, maxHoursMonth: 170, locationId: locA.id },
    { name: 'Ben Schmidt', email: 'ben@simple-roster.de', hourlyRate: 16.0, overheadPercent: 20, maxHoursWeek: 40, maxHoursMonth: 170, locationId: locB.id },
    { name: 'Clara Weber', email: 'clara@simple-roster.de', hourlyRate: 13.5, overheadPercent: 22, maxHoursWeek: 20, maxHoursMonth: 85, locationId: null },
  ]

  for (const emp of employees) {
    await prisma.user.upsert({
      where: { email: emp.email },
      update: {},
      create: {
        name: emp.name,
        email: emp.email,
        passwordHash: pw,
        role: 'EMPLOYEE',
        hourlyRate: emp.hourlyRate,
        overheadPercent: emp.overheadPercent,
        maxHoursWeek: emp.maxHoursWeek,
        maxHoursMonth: emp.maxHoursMonth,
        primaryLocationId: emp.locationId,
      },
    })
  }

  console.log('✅ Seed abgeschlossen')
  console.log('   Admin:   admin@simple-roster.de / admin1234')
  console.log('   MA:      anna@simple-roster.de  / test1234')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
