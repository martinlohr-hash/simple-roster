import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/db'
import PersonalbogenForm, { type PersonalbogenUser } from '@/components/admin/PersonalbogenForm'

type Props = { params: Promise<{ id: string }> }

const d = (v: Date | null) => (v ? v.toISOString().split('T')[0] : null)

export default async function EmployeePersonalbogenPage({ params }: Props) {
  const { id } = await params
  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) notFound()

  const data: PersonalbogenUser = {
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
    entryDate: d(user.entryDate),
    exitDate: d(user.exitDate),
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
    vacationDaysAnnual: user.vacationDaysAnnual,
    vacationDaysProRata: user.vacationDaysProRata,
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <Link href="/admin/personalbogen" className="text-sm text-gray-500 hover:text-gray-900">← Personalbögen</Link>
        <h1 className="text-xl font-semibold text-gray-900 mt-2">Personalbogen – {user.name}</h1>
        <p className="text-sm text-gray-500 mt-1">
          {user.onboardingCompletedAt
            ? 'Persönliche Daten wurden vom Mitarbeiter ausgefüllt – du kannst sie korrigieren und die Beschäftigungsdaten ergänzen.'
            : 'Der Mitarbeiter hat seine Daten noch nicht ausgefüllt. Du kannst sie hier vorab eintragen.'}
        </p>
      </div>
      <PersonalbogenForm user={data} />
    </div>
  )
}
