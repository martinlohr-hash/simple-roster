import { redirect } from 'next/navigation'

// Eingeklappt in die Mitarbeiter-Detailseite (Reiter „Beschäftigung").
type Props = { params: Promise<{ id: string }> }

export default async function PersonalbogenRedirect({ params }: Props) {
  const { id } = await params
  redirect(`/admin/employees/${id}?tab=beschaeftigung`)
}
