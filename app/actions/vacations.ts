'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { getSession } from '@/app/actions/auth'
import { isAdmin, isSuperAdmin } from '@/lib/session'
import { calcWorkdays, calcVacationRemaining } from '@/lib/vacation'
import { getCurrentBalance } from '@/lib/vacationBalance'

export async function createVacationRequest(formData: FormData): Promise<{ error?: string }> {
  const session = await getSession()
  if (!session) return { error: 'Nicht angemeldet' }

  const startDate = new Date(formData.get('startDate') as string)
  const endDate = new Date(formData.get('endDate') as string)
  const note = (formData.get('note') as string) || null

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return { error: 'Ungültiges Datum' }
  if (endDate < startDate) return { error: 'Enddatum muss nach dem Startdatum liegen' }

  const workdays = calcWorkdays(startDate, endDate)
  if (workdays === 0) return { error: 'Kein Werktag im gewählten Zeitraum' }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { vacationDaysPerYear: true, startDate: true },
  })
  if (!user) return { error: 'Mitarbeiter nicht gefunden' }

  const existing = await prisma.vacationRequest.findMany({
    where: { userId: session.userId, status: { not: 'REJECTED' } },
  })
  const remaining = calcVacationRemaining(user, existing, await getCurrentBalance(session.userId))
  if (workdays > remaining) {
    return { error: `Nicht genug Resturlaub. Verfügbar: ${remaining} Tage, beantragt: ${workdays} Tage.` }
  }

  await prisma.vacationRequest.create({
    data: { userId: session.userId, startDate, endDate, workdays, note, status: 'PENDING' },
  })

  revalidatePath('/employee/vacation')
  return {}
}

export async function createVacationAdmin(formData: FormData): Promise<{ error?: string }> {
  const session = await getSession()
  if (!session || !isAdmin(session.role)) return { error: 'Keine Berechtigung' }

  const userId = formData.get('userId') as string
  const startDate = new Date(formData.get('startDate') as string)
  const endDate = new Date(formData.get('endDate') as string)
  const note = (formData.get('note') as string) || null

  if (!userId) return { error: 'Mitarbeiter wählen' }
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return { error: 'Ungültiges Datum' }
  if (endDate < startDate) return { error: 'Enddatum muss nach dem Startdatum liegen' }

  const workdays = calcWorkdays(startDate, endDate)
  if (workdays === 0) return { error: 'Kein Werktag im gewählten Zeitraum' }

  await prisma.vacationRequest.create({
    data: {
      userId,
      startDate,
      endDate,
      workdays,
      note,
      status: 'APPROVED',
      reviewedBy: session.userId,
      reviewedAt: new Date(),
    },
  })

  revalidatePath('/admin/vacations')
  revalidatePath('/admin/schedule')
  return {}
}

export async function approveVacation(id: string): Promise<void> {
  const session = await getSession()
  if (!session || !isAdmin(session.role)) throw new Error('Keine Berechtigung')

  await prisma.vacationRequest.update({
    where: { id },
    data: { status: 'APPROVED', reviewedBy: session.userId, reviewedAt: new Date() },
  })

  revalidatePath('/admin/vacations')
  revalidatePath('/admin/schedule')
}

export async function rejectVacation(id: string): Promise<void> {
  const session = await getSession()
  if (!session || !isAdmin(session.role)) throw new Error('Keine Berechtigung')

  await prisma.vacationRequest.update({
    where: { id },
    data: { status: 'REJECTED', reviewedBy: session.userId, reviewedAt: new Date() },
  })

  revalidatePath('/admin/vacations')
}

export async function deleteVacation(id: string): Promise<void> {
  const session = await getSession()
  if (!session || !isAdmin(session.role)) throw new Error('Keine Berechtigung')

  await prisma.vacationRequest.delete({ where: { id } })

  revalidatePath('/admin/vacations')
  revalidatePath('/admin/schedule')
}

export async function updateVacationRequest(id: string, formData: FormData): Promise<{ error?: string }> {
  const session = await getSession()
  if (!session || !isSuperAdmin(session.role)) return { error: 'Keine Berechtigung' }

  const newStartDate = new Date(formData.get('startDate') as string)
  const newEndDate = new Date(formData.get('endDate') as string)
  const newNote = (formData.get('note') as string) || null

  if (isNaN(newStartDate.getTime()) || isNaN(newEndDate.getTime())) return { error: 'Ungültiges Datum' }
  if (newEndDate < newStartDate) return { error: 'Enddatum muss nach dem Startdatum liegen' }

  const newWorkdays = calcWorkdays(newStartDate, newEndDate)
  if (newWorkdays === 0) return { error: 'Kein Werktag im gewählten Zeitraum' }

  const existing = await prisma.vacationRequest.findUnique({
    where: { id },
    include: { user: { select: { vacationDaysPerYear: true, startDate: true } } },
  })
  if (!existing) return { error: 'Urlaubseintrag nicht gefunden' }

  // Re-validate remaining days if workdays increased
  if (newWorkdays > existing.workdays) {
    const allVacations = await prisma.vacationRequest.findMany({
      where: { userId: existing.userId, status: { not: 'REJECTED' }, id: { not: id } },
    })
    const remaining = calcVacationRemaining(existing.user, allVacations, await getCurrentBalance(existing.userId))
    const additional = newWorkdays - existing.workdays
    if (additional > remaining) {
      return { error: `Nicht genug Resturlaub für die Erhöhung. Verfügbar: ${remaining} Tage, zusätzlich erforderlich: ${additional} Tage.` }
    }
  }

  // Create history entry
  await prisma.vacationRequestHistory.create({
    data: {
      vacationId: id,
      changedBy: session.userId,
      changeType: 'UPDATED',
      oldStartDate: existing.startDate,
      newStartDate,
      oldEndDate: existing.endDate,
      newEndDate,
      oldWorkdays: existing.workdays,
      newWorkdays,
      oldNote: existing.note,
      newNote,
    },
  })

  // Update vacation
  await prisma.vacationRequest.update({
    where: { id },
    data: {
      startDate: newStartDate,
      endDate: newEndDate,
      workdays: newWorkdays,
      note: newNote,
    },
  })

  revalidatePath('/admin/vacations')
  revalidatePath('/admin/schedule')
  return {}
}


// Admin: Jahresanspruch + Übertrag eines Mitarbeiters für ein Jahr festschreiben (Urlaub-Reiter der Personalakte).
export async function saveVacationYearBalance(
  userId: string,
  year: number,
  entitlement: number,
  carryOver: number,
): Promise<{ error?: string }> {
  const session = await getSession()
  if (!session || !isAdmin(session.role)) return { error: 'Keine Berechtigung' }
  if (!Number.isInteger(year) || year < 2000 || year > 2100) return { error: 'Ungültiges Jahr' }
  if (!Number.isInteger(entitlement) || entitlement < 0 || entitlement > 366) return { error: 'Ungültiger Anspruch' }
  if (!Number.isInteger(carryOver) || carryOver < -366 || carryOver > 366) return { error: 'Ungültiger Übertrag' }

  await prisma.vacationYearBalance.upsert({
    where: { userId_year: { userId, year } },
    create: { userId, year, entitlement, carryOver },
    update: { entitlement, carryOver },
  })
  revalidatePath(`/admin/employees/${userId}`)
  revalidatePath('/admin/vacations')
  revalidatePath('/employee/vacation')
  return {}
}
