import { redirect } from 'next/navigation'

// Übersicht + Sammelexport leben jetzt in der Mitarbeiterliste.
export default function PersonalbogenOverviewRedirect() {
  redirect('/admin/employees')
}
