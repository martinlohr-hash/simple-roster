import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { decrypt, isAdmin } from '@/lib/session'
import { prisma } from '@/lib/db'
import {
  personalbogenExcel,
  personalbogenCsv,
  personalbogenFileBase,
} from '@/lib/personalbogen/export'

export async function GET(request: NextRequest) {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  const session = token ? await decrypt(token) : null
  if (!session || !isAdmin(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sp = request.nextUrl.searchParams
  const fmt = sp.get('format') || 'csv'
  const scope = sp.get('scope') || 'active' // active = ohne ausgetretene MA
  const userId = sp.get('userId') // gesetzt = Einzel-Export nur dieses MA

  const users = await prisma.user.findMany({
    where: userId
      ? { id: userId }
      : scope === 'active'
        ? { endDate: null }
        : {},
    orderBy: [{ lastName: 'asc' }, { name: 'asc' }],
  })

  const fileBase = personalbogenFileBase(users)

  if (fmt === 'excel') {
    const buf = await personalbogenExcel(users)
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileBase}.xlsx"`,
      },
    })
  }

  return new NextResponse('﻿' + personalbogenCsv(users), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${fileBase}.csv"`,
    },
  })
}
