// Fachliche Fehler aus Server Actions kommen als Rückgabewert { error } zurück,
// weil Next.js geworfene Errors in Production maskiert. Dieser Helper wirft sie
// CLIENT-seitig neu, damit bestehende try/catch-UI-Logik weiter funktioniert.
export type ActionResult = { error?: string } | void

export function unwrap(res: ActionResult): void {
  if (res && res.error) throw new Error(res.error)
}
