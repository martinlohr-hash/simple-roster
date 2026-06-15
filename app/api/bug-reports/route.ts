import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { decrypt } from '@/lib/session'
import { prisma } from '@/lib/db'

async function getSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  return token ? decrypt(token) : null
}

export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const reports = await prisma.bugReport.findMany({
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(reports)
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { area, description } = await request.json()
  if (!area || !description?.trim()) {
    return NextResponse.json({ error: 'Bereich und Beschreibung erforderlich.' }, { status: 400 })
  }

  const report = await prisma.bugReport.create({
    data: {
      area,
      description: description.trim(),
      reportedBy: session.name as string,
    },
  })

  return NextResponse.json(report, { status: 201 })
}
