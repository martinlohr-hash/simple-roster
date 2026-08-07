'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireAdmin, getSession } from '@/app/actions/auth'

export type PayrollAdjustmentActionResult = { error?: string }

type AddInput = {
  userId: string
  periodFrom: string // yyyy-MM-dd
  periodTo: string // yyyy-MM-dd
  hours: number
  reason: string
}

/** Legt eine manuelle Ist-Stunden-Korrektur für einen Lohn-Export-Zeitraum an. */
export async function addPayrollAdjustment(input: AddInput): Promise<PayrollAdjustmentActionResult> {
  await requireAdmin()

  if (!input.userId || !input.periodFrom || !input.periodTo) {
    return { error: 'Mitarbeiter und Zeitraum sind erforderlich.' }
  }
  if (!Number.isFinite(input.hours) || input.hours === 0) {
    return { error: 'Bitte eine Stunden-Korrektur ungleich 0 angeben.' }
  }
  const reason = input.reason.trim()
  if (!reason) {
    return { error: 'Begründung ist erforderlich.' }
  }

  const session = await getSession()
  await prisma.payrollAdjustment.create({
    data: {
      userId: input.userId,
      periodFrom: input.periodFrom,
      periodTo: input.periodTo,
      hours: input.hours,
      reason,
      createdBy: session?.name ?? null,
    },
  })

  revalidatePath('/admin/export')
  return {}
}

/** Löscht eine zuvor angelegte Lohn-Korrektur wieder. */
export async function deletePayrollAdjustment(id: string): Promise<PayrollAdjustmentActionResult> {
  await requireAdmin()
  if (!id) return { error: 'Ungültige Korrektur.' }

  await prisma.payrollAdjustment.delete({ where: { id } })
  revalidatePath('/admin/export')
  return {}
}
