import 'dotenv/config'
import { PrismaClient } from '../app/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const prisma = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL!) })

const LOC = 'loc-a' // Weidenallee – alle Schichten

// User-IDs
const M = 'cmqevjqiy0002kv8ofba4wjzk' // Martin Lohr (Küche)
const S = 'cmqevjqna0006kv8oeltoap2g' // Stephan Kolba
const MIA = 'cmqevjqjx0003kv8o7lkry1e7' // Mia von Westphalen
const DAR = 'cmqevjqcg0001kv8oi9n319ug' // Dariia Ielisavenko
const ANT = 'cmqevjqb10000kv8oo7fxtnnu' // Anton Elia Schuppli

// [datum, start, ende, userId]   – nur 18.–28. Juni, "Freier Tag" übersprungen
const plan: [string, string, string, string][] = [
  // --- Martin Lohr (Küche) ---
  ['2026-06-18', '12:00', '20:00', M],
  ['2026-06-19', '11:00', '17:00', M],
  ['2026-06-21', '10:00', '18:30', M],
  ['2026-06-26', '12:00', '19:30', M],
  ['2026-06-27', '10:00', '18:30', M],
  ['2026-06-28', '10:00', '18:30', M],
  // --- Stephan Kolba (POS/Sandwichstation) ---
  ['2026-06-18', '11:00', '20:00', S],
  ['2026-06-19', '12:00', '19:30', S],
  ['2026-06-20', '10:00', '18:30', S],
  ['2026-06-21', '13:00', '18:30', S],
  ['2026-06-22', '11:00', '19:30', S],
  ['2026-06-23', '11:00', '19:30', S],
  ['2026-06-24', '11:00', '19:30', S],
  ['2026-06-25', '11:00', '19:30', S],
  ['2026-06-26', '11:00', '17:00', S],
  // --- Mia von Westphalen ---
  ['2026-06-20', '12:00', '16:00', MIA],
  ['2026-06-27', '12:00', '16:00', MIA],
  // --- Dariia Ielisavenko ---
  ['2026-06-21', '12:00', '16:00', DAR],
  // --- Anton Elia Schuppli ---
  ['2026-06-28', '12:00', '16:00', ANT],
]

async function main() {
  // 1) Bestehende Weidenallee-Schichten 18.–28. Juni löschen (Phoxxi bleibt unangetastet)
  const del = await prisma.shift.deleteMany({
    where: {
      locationId: LOC,
      date: { gte: new Date('2026-06-18T00:00:00.000Z'), lt: new Date('2026-06-29T00:00:00.000Z') },
    },
  })
  console.log(`🗑️  ${del.count} bestehende Weidenallee-Schichten (18.–28.) gelöscht`)

  // 2) Plan anlegen
  const res = await prisma.shift.createMany({
    data: plan.map(([date, startTime, endTime, userId]) => ({
      userId,
      locationId: LOC,
      date: new Date(date + 'T00:00:00.000Z'),
      startTime,
      endTime,
      status: 'PLANNED' as const,
    })),
  })
  console.log(`✅ ${res.count} Schichten aus dem Plan angelegt`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
