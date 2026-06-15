'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { getSession } from '@/app/actions/auth'

type BudgetInput = {
  period: 'WEEKLY' | 'MONTHLY'
  year: number
  weekOrMonth: number
  type: 'HOURS' | 'EUROS'
  amount: number
}

export async function setBudget(data: BudgetInput): Promise<void> {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') throw new Error('Unauthorized')

  await prisma.budget.upsert({
    where: {
      period_year_weekOrMonth: {
        period: data.period,
        year: data.year,
        weekOrMonth: data.weekOrMonth,
      },
    },
    update: { type: data.type, amount: data.amount },
    create: {
      period: data.period,
      year: data.year,
      weekOrMonth: data.weekOrMonth,
      type: data.type,
      amount: data.amount,
    },
  })

  revalidatePath('/admin/costs')
}
