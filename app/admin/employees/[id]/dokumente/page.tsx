import { redirect } from 'next/navigation'

// Eingeklappt in die Mitarbeiter-Detailseite (Reiter „Dokumente").
type Props = { params: Promise<{ id: string }> }

export default async function DokumenteRedirect({ params }: Props) {
  const { id } = await params
  redirect(`/admin/employees/${id}?tab=dokumente`)
}
