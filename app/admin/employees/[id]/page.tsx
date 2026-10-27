import { notFound } from 'next/navigation'
import Link from 'next/link'
import { IconBrain } from '@tabler/icons-react'
import { addDays, differenceInMonths, endOfMonth, endOfWeek, format, parseISO, startOfMonth, startOfWeek } from 'date-fns'
import { de } from 'date-fns/locale'
import { prisma } from '@/lib/db'
import { shiftDurationHours } from '@/lib/timeUtils'
import EmployeeProfileCard, { type ProfileCardData } from '@/components/admin/EmployeeProfileCard'
import { updateEmployee } from '@/app/actions/employees'
import { getSession } from '@/app/actions/auth'
import { isSuperAdmin } from '@/lib/session'
import { missingFields } from '@/lib/documents'
import EmployeeDetailTabs, { type DetailTab } from '@/components/admin/EmployeeDetailTabs'
import { buildVacationYears, vacationInclude } from '@/lib/vacationHistory'
import { type PersonalbogenUser } from '@/components/admin/PersonalbogenForm'

export const metadata = { title: 'Mitarbeiter' }

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string; payrollNotice?: string }>
}

const d = (v: Date | null) => (v ? v.toISOString().split('T')[0] : null)

const VALID_TABS: DetailTab[] = ['stammdaten', 'beschaeftigung', 'urlaub', 'dokumente']
const VALID_PAYROLL_NOTICES = ['sent-confirmed', 'sent-unconfirmed', 'failed'] as const
type PayrollNotice = (typeof VALID_PAYROLL_NOTICES)[number]

export default async function EmployeeDetailPage({ params, searchParams }: Props) {
  const [{ id }, sp, session] = await Promise.all([params, searchParams, getSession()])
  // „Heute" und Wochengrenzen in Berliner Zeit (Server läuft ggf. in UTC)
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Berlin' })
  const today = parseISO(todayStr)
  const weekStart = startOfWeek(today, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 })
  const monthStart = startOfMonth(today)
  const monthEnd = endOfMonth(today)
  const rangeStart = weekStart < monthStart ? weekStart : monthStart
  const rangeEnd = weekEnd > monthEnd ? weekEnd : monthEnd

  const [user, locations, vacations, balances, rangeShifts, upcoming] = await Promise.all([
    prisma.user.findUnique({ where: { id } }),
    prisma.location.findMany({ orderBy: { sortOrder: 'asc' } }),
    prisma.vacationRequest.findMany({
      where: { userId: id },
      orderBy: { startDate: 'asc' },
      include: vacationInclude,
    }),
    prisma.vacationYearBalance.findMany({ where: { userId: id } }),
    prisma.shift.findMany({
      where: { userId: id, status: { not: 'CANCELLED' }, date: { gte: rangeStart, lte: rangeEnd } },
      select: { date: true, startTime: true, endTime: true },
    }),
    prisma.shift.findMany({
      where: { userId: id, status: { not: 'CANCELLED' }, date: { gte: today } },
      include: { location: { select: { name: true } } },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      take: 4,
    }),
  ])
  if (!user) notFound()

  const vacationYears = buildVacationYears(user, vacations, balances)

  // Daten für die Mitarbeiterkarte (nur Admin-Ansicht, daher inkl. Kontakt und Stunden)
  const dayKey = (dt: Date) => format(dt, 'yyyy-MM-dd')
  const hoursOf = (from: Date, to: Date) =>
    rangeShifts
      .filter((sh) => sh.date >= from && sh.date <= to)
      .reduce((sum, sh) => sum + shiftDurationHours(sh.startTime, sh.endTime), 0)
  const weekBars = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(weekStart, i)
    const key = dayKey(day)
    return {
      label: ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'][i],
      hours: rangeShifts
        .filter((sh) => dayKey(sh.date) === key)
        .reduce((sum, sh) => sum + shiftDurationHours(sh.startTime, sh.endTime), 0),
      isToday: key === todayStr,
    }
  })
  const year = vacationYears.find((y) => y.year === today.getFullYear())
  const months = user.startDate ? differenceInMonths(today, user.startDate) : null
  const cardData: ProfileCardData = {
    name: user.name,
    roleLabel:
      user.jobTitle?.trim() ||
      (user.role === 'SUPER_ADMIN' ? 'Geschäftsführung' : user.role === 'ADMIN' ? 'Admin' : 'Mitarbeiter'),
    status: user.status === 'PENDING' ? 'pending' : user.endDate && user.endDate < today ? 'left' : 'active',
    color: locations.find((l) => l.id === user.primaryLocationId)?.color ?? '#4f46e5',
    homeLocation: locations.find((l) => l.id === user.primaryLocationId)?.name ?? null,
    email: user.email,
    phone: user.phone,
    sinceLabel: user.startDate ? format(user.startDate, 'MMM yyyy', { locale: de }) : null,
    tenureLabel:
      months == null
        ? null
        : months < 1
          ? 'weniger als 1 Monat'
          : months < 12
            ? `${months} ${months === 1 ? 'Monat' : 'Monate'}`
            : `${Math.floor(months / 12)} ${Math.floor(months / 12) === 1 ? 'Jahr' : 'Jahre'}${months % 12 ? `, ${months % 12} Mon.` : ''}`,
    weekHours: hoursOf(weekStart, weekEnd),
    weekMax: user.maxHoursWeek ?? null,
    monthHours: hoursOf(monthStart, monthEnd),
    monthMax: user.maxHoursMonth ?? null,
    monthLabel: format(today, 'LLLL', { locale: de }),
    vacationRemaining: year ? year.remaining : null,
    vacationEntitlement: year ? year.entitlement : null,
    vacationPending: year ? year.pending : 0,
    weekBars,
    nextShifts: upcoming.slice(0, 4).map((sh) => ({
      dateLabel: format(sh.date, 'EEE, d. MMM', { locale: de }),
      time: `${sh.startTime} – ${sh.endTime}`,
      location: sh.location.name,
      hours: shiftDurationHours(sh.startTime, sh.endTime),
    })),
  }

  const initialTab: DetailTab = VALID_TABS.includes(sp.tab as DetailTab)
    ? (sp.tab as DetailTab)
    : 'stammdaten'
  const showInsights = !!session && isSuperAdmin(session.role)

  // DTO für den Personalbogen (1:1 wie zuvor in personalbogen/page.tsx)
  const personalbogenUser: PersonalbogenUser = {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    street: user.street,
    postalCode: user.postalCode,
    city: user.city,
    nationality: user.nationality,
    birthday: d(user.birthday),
    birthName: user.birthName,
    birthPlace: user.birthPlace,
    gender: user.gender,
    taxId: user.taxId,
    socialSecurityNo: user.socialSecurityNo,
    iban: user.iban,
    healthInsurance: user.healthInsurance,
    phone: user.phone,
    personnelNumber: user.personnelNumber,
    // Kanonische Quelle = operative Spalten
    entryDate: d(user.startDate),
    exitDate: d(user.endDate),
    jobTitle: user.jobTitle,
    weeklyWorkTime: user.weeklyWorkTime,
    grossSalary: user.grossSalary,
    additionalSalaryComponents: user.additionalSalaryComponents,
    specialPayments: user.specialPayments,
    payrollType: user.payrollType,
    shortTermLimit: user.shortTermLimit,
    voluntaryInternship: user.voluntaryInternship,
    shareholderPercent: user.shareholderPercent,
    otherEmployment: user.otherEmployment,
    vacationDaysAnnual: user.vacationDaysPerYear,
    vacationDaysProRata: user.vacationDaysProRata,
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <Link
        href="/admin/employees"
        className="inline-flex min-h-11 items-center text-sm text-gray-600 hover:text-gray-900 -mt-2 mb-1"
      >
        ← Mitarbeiter
      </Link>
      <div className="mb-6">
        <EmployeeProfileCard
          data={cardData}
          actions={
            showInsights ? (
              <Link
                href={`/admin/employees/${id}/insights`}
                className="inline-flex min-h-11 items-center gap-1.5 px-4 text-sm font-medium rounded-full bg-gray-900 text-white hover:bg-gray-800 transition shrink-0"
              >
                <IconBrain size={16} stroke={1.75} />
                Insights
              </Link>
            ) : null
          }
        />
      </div>

      <EmployeeDetailTabs
        userId={user.id}
        initialTab={initialTab}
        payrollNotice={
          VALID_PAYROLL_NOTICES.includes(sp.payrollNotice as PayrollNotice)
            ? (sp.payrollNotice as PayrollNotice)
            : null
        }
        updateAction={updateEmployee.bind(null, id)}
        locations={locations.map((l) => ({ id: l.id, name: l.name }))}
        employeeDefaults={{
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          hourlyRate: user.hourlyRate,
          monthlyRate: user.monthlyRate,
          overheadPercent: user.overheadPercent,
          maxHoursWeek: user.maxHoursWeek,
          maxHoursMonth: user.maxHoursMonth,
          vacationDaysPerYear: user.vacationDaysPerYear,
          primaryLocationId: user.primaryLocationId,
          startDate: user.startDate,
          endDate: user.endDate,
          phone: user.phone,
          birthday: user.birthday,
          street: user.street,
          postalCode: user.postalCode,
          city: user.city,
          unavailableDays: user.unavailableDays,
          preferredDays: user.preferredDays,
          earliestStart: user.earliestStart,
          latestEnd: user.latestEnd,
          onboardingCompletedAt: user.onboardingCompletedAt,
        }}
        personalbogenUser={personalbogenUser}
        documentsUrl={user.documentsUrl}
        sofortmeldungSentAt={user.sofortmeldungSentAt?.toISOString() ?? null}
        contractMissing={missingFields(user, 'arbeitsvertrag')}
        probezeitMissing={missingFields(user, 'kuendigung-probezeit')}
        regulaerMissing={missingFields(user, 'kuendigung-regulaer')}
        vacationYears={vacationYears}
      />
    </div>
  )
}
