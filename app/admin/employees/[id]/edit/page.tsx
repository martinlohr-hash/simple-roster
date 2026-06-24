import { redirect } from 'next/navigation'

// Eingeklappt in die Mitarbeiter-Detailseite (Reiter „Stammdaten").
type Props = { params: Promise<{ id: string }> }

export default async function EditRedirect({ params }: Props) {
  const { id } = await params
  redirect(`/admin/employees/${id}?tab=stammdaten`)
}
