'use server'

import { revalidatePath } from 'next/cache'
import { fromZonedTime } from 'date-fns-tz'
import { prisma } from '@/lib/db'
import { requireAdmin, getSession } from '@/app/actions/auth'
import { computeDayHours } from '@/lib/dayHours'

// Fachliche Fehler als Rückgabewert statt throw: geworfene Errors werden von
// Next.js in Production maskiert und kämen beim Nutzer nie an.
export type TimesheetActionResult = { error?: string }

/**
 * Baut aus "yyyy-MM-dd" + "HH:mm" den passenden UTC-Zeitpunkt für Europe/Berlin.
 * `new Date(y, m-1, d, hh, mm)` nutzt sonst die Server-Zeitzone (Vercel = UTC),
 * wodurch eingegebene Zeiten in Prod um 1-2h verschoben gespeichert wurden.
 */
function combineDateTime(dateStr: string, timeStr: string): Date {
  return fromZonedTime(`${dateStr}T${timeStr}:00`, 'Europe/Berlin')
}

type CreateInput = {
  userId: string
  locationId: string
  date: string // yyyy-MM-dd
  checkin: string // HH:mm
  checkout?: string // HH:mm (optional)
}

/** Admin trägt einen Stempel-Eintrag für einen Mitarbeiter nach (z. B. wenn vergessen wurde zu stempeln). */
export async function adminCreateTimeEntry(input: CreateInput): Promise<TimesheetActionResult> {
  await requireAdmin()

  if (!input.userId || !input.locationId || !input.date || !input.checkin) {
    return { error: 'Mitarbeiter, Standort, Datum und Beginn sind erforderlich.' }
  }

  const checkinAt = combineDateTime(input.date, input.checkin)
  let checkoutAt: Date | null = null
  if (input.checkout) {
    checkoutAt = combineDateTime(input.date, input.checkout)
    // Über-Mitternacht-Schicht: Ende am Folgetag
    if (checkoutAt <= checkinAt) checkoutAt = new Date(checkoutAt.getTime() + 24 * 60 * 60 * 1000)
  }

  await prisma.timeEntry.create({
    data: { userId: input.userId, locationId: input.locationId, checkinAt, checkoutAt },
  })

  revalidatePath('/admin/timesheets')
  return {}
}

type UpdateInput = {
  id: string
  date: string // yyyy-MM-dd (Bezugstag für die Zeiten)
  checkin: string // HH:mm
  checkout?: string // HH:mm leer = noch offen
  locationId?: string
}

/** Admin korrigiert Beginn/Ende (oder Standort) eines bestehenden Eintrags. */
export async function adminUpdateTimeEntry(input: UpdateInput): Promise<TimesheetActionResult> {
  await requireAdmin()

  if (!input.id || !input.date || !input.checkin) {
    return { error: 'Eintrag, Datum und Beginn sind erforderlich.' }
  }

  const checkinAt = combineDateTime(input.date, input.checkin)
  let checkoutAt: Date | null = null
  if (input.checkout) {
    checkoutAt = combineDateTime(input.date, input.checkout)
    if (checkoutAt <= checkinAt) checkoutAt = new Date(checkoutAt.getTime() + 24 * 60 * 60 * 1000)
  }

  await prisma.timeEntry.update({
    where: { id: input.id },
    data: {
      checkinAt,
      checkoutAt,
      ...(input.locationId ? { locationId: input.locationId } : {}),
    },
  })

  revalidatePath('/admin/timesheets')
  revalidatePath('/admin/schedule')
  return {}
}

/** Admin löscht einen Eintrag (z. B. Doppel-Stempelung). */
export async function adminDeleteTimeEntry(id: string): Promise<TimesheetActionResult> {
  await requireAdmin()
  if (!id) return { error: 'Kein Eintrag angegeben.' }

  await prisma.timeEntry.delete({ where: { id } })
  revalidatePath('/admin/timesheets')
  return {}
}

/**
 * Gibt einen Tag frei: friert die aktuellen Tages-Gesamtstunden als Snapshot ein.
 * Nur freigegebene Tage werden in die Auswertungs-Tabelle synchronisiert.
 */
export async function releaseDay(day: string): Promise<TimesheetActionResult> {
  await requireAdmin()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return { error: 'Ungültiger Tag.' }

  const session = await getSession()
  const { hours, entries } = await computeDayHours(day)

  await prisma.timesheetRelease.upsert({
    where: { day },
    create: { day, hours, entries, releasedBy: session?.name ?? null },
    update: { hours, entries, releasedAt: new Date(), releasedBy: session?.name ?? null },
  })

  revalidatePath('/admin/timesheets')
  return {}
}

/** Hebt die Freigabe eines Tages wieder auf (wird dann nicht mehr synchronisiert). */
export async function unreleaseDay(day: string): Promise<TimesheetActionResult> {
  await requireAdmin()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return { error: 'Ungültiger Tag.' }

  await prisma.timesheetRelease.deleteMany({ where: { day } })
  revalidatePath('/admin/timesheets')
  return {}
}
