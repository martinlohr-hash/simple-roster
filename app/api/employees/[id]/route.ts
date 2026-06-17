import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { decrypt, isAdmin, isSuperAdmin } from '@/lib/session'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'

async function getAdminSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  const session = token ? await decrypt(token) : null
  if (!session || session.role !== 'ADMIN') return null
  return session
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const user = await prisma.user.findUnique({
    where: { id },
    include: { primaryLocation: true },
  })
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(user)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  if (!isSuperAdmin(session.role)) {
    const target = await prisma.user.findUnique({ where: { id }, select: { role: true } })
    if (target && isSuperAdmin(target.role)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const body = await req.json()

  const data: Record<string, unknown> = {
    name: body.name,
    email: body.email,
    role: body.role,
    hourlyRate: body.salaryType === 'monthly' ? 0 : (parseFloat(body.hourlyRate) || 0),
    monthlyRate: body.salaryType === 'monthly' ? (parseFloat(body.monthlyRate) || 0) : null,
    overheadPercent: parseFloat(body.overheadPercent) || 0,
    maxHoursWeek: body.maxHoursWeek ? parseFloat(body.maxHoursWeek) : null,
    maxHoursMonth: body.maxHoursMonth ? parseFloat(body.maxHoursMonth) : null,
    startDate: body.startDate ? new Date(body.startDate) : null,
    endDate: body.endDate ? new Date(body.endDate) : null,
    birthday: body.birthday ? new Date(body.birthday) : null,
    phone: body.phone || null,
    address: body.address || null,
    primaryLocationId: body.locationId || null,
  }

  if (body.password) {
    data.passwordHash = await bcrypt.hash(body.password, 10)
  }

  const user = await prisma.user.update({ where: { id }, data })
  return NextResponse.json(user)
}
