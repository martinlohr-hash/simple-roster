import { notFound } from 'next/navigation'
import Link from 'next/link'
import { IconBrain } from '@tabler/icons-react'
import { prisma } from '@/lib/db'
import { updateEmployee } from '@/app/actions/employees'
import { getSession } from '@/app/actions/auth'
import { isSuperAdmin } from '@/lib/session'
import { missingFields } from '@/lib/documents'
import EmployeeDetailTabs, { type DetailTab } from '@/components/admin/EmployeeDetailTabs'
import { calcEntitlementForYear } from '@/lib/vacation'
import { type VacationYear } from '@/components/admin/VacationHistory'
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
  const [user, locations, vacations] = await Promise.all([
    prisma.user.findUnique({ where: { id } }),
    prisma.location.findMany({ orderBy: { sortOrder: 'asc' } }),
    prisma.vacationRequest.findMany({
      where: { userId: id },
      orderBy: { startDate: 'asc' },
      include: {
        reviewer: { select: { name: true } },
        history: {
          where: { changeType: 'UPDATED' },
          orderBy: { changedAt: 'asc' },
          include: { changedByUser: { select: { name: true } } },
        },
      },
    }),
  ])
  if (!user) notFound()

  // Urlaubshistorie pro Jahr (Zuordnung nach Startdatum, wie calcVacationUsed): Resturlaub-Verlauf
  // läuft chronologisch über genehmigte Anträge.
  const byYear = new Map<number, typeof vacations>()
  for (const v of vacations) {
    const y = v.startDate.getFullYear()
    byYear.set(y, [...(byYear.get(y) ?? []), v])
  }
  const vacationYears: VacationYear[] = [...byYear.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([year, list]) => {
      const entitlement = calcEntitlementForYear(user, year)
      let used = 0
      const entries = list.map((v) => {
        let remainingAfter: number | null = null
        if (v.status === 'APPROVED') {
          used += v.workdays
          remainingAfter = entitlement - used
        }
        return {
          id: v.id,
          startDate: v.startDate.toISOString(),
          endDate: v.endDate.toISOString(),
          workdays: v.workdays,
          status: v.status as 'PENDING' | 'APPROVED' | 'REJECTED',
          note: v.note,
          createdAt: v.createdAt.toISOString(),
          reviewedAt: v.reviewedAt?.toISOString() ?? null,
          reviewerName: v.reviewer?.name ?? null,
          remainingAfter,
          changes: v.history.map((h) => ({
            at: h.changedAt.toISOString(),
            by: h.changedByUser.name,
            text:
              h.oldWorkdays !== null && h.newWorkdays !== null && h.oldWorkdays !== h.newWorkdays
                ? `Korrigiert: ${h.oldWorkdays} → ${h.newWorkdays} Tage`
                : 'Geändert',
          })),
        }
      })
      return {
        year,
        entitlement,
        used,
        remaining: entitlement - used,
        pending: list.filter((v) => v.status === 'PENDING').reduce((n, v) => n + v.workdays, 0),
        entries,
      }
    })

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
      <div className="mb-6">
        <Link href="/admin/employees" className="text-sm text-gray-500 hover:text-gray-900">
          ← Mitarbeiter
        </Link>
        <div className="flex items-center justify-between gap-3 mt-2 max-w-3xl">
          <h1 className="text-xl font-semibold text-gray-900">{user.name}</h1>
          {showInsights && (
            <Link
              href={`/admin/employees/${id}/insights`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-indigo-200 text-indigo-700 hover:bg-indigo-50 transition shrink-0"
            >
              <IconBrain size={15} stroke={1.75} />
              Insights
            </Link>
          )}
        </div>
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
