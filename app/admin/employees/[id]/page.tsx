import { notFound } from 'next/navigation'
import Link from 'next/link'
import { IconBrain } from '@tabler/icons-react'
import { prisma } from '@/lib/db'
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
  const [user, locations, vacations, balances] = await Promise.all([
    prisma.user.findUnique({ where: { id } }),
    prisma.location.findMany({ orderBy: { sortOrder: 'asc' } }),
    prisma.vacationRequest.findMany({
      where: { userId: id },
      orderBy: { startDate: 'asc' },
      include: vacationInclude,
    }),
    prisma.vacationYearBalance.findMany({ where: { userId: id } }),
  ])
  if (!user) notFound()

  const vacationYears = buildVacationYears(user, vacations, balances)

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
