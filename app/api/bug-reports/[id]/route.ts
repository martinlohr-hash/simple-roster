import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { decrypt, isAdmin } from '@/lib/session'
import { prisma } from '@/lib/db'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  const session = token ? await decrypt(token) : null
  if (!session || !isAdmin(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const { status } = await request.json()
  if (status !== 'OPEN' && status !== 'RESOLVED') {
    return NextResponse.json({ error: 'Ungültiger Status.' }, { status: 400 })
  }

  const report = await prisma.bugReport.update({
    where: { id },
    data: { status },
  })

  return NextResponse.json(report)
}
