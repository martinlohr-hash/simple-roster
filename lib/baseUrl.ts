// Server-seitige Basis-URL für Links in E-Mails (dort gibt es kein window.location).
// Reihenfolge: explizit gesetzte App-URL → Vercel-Produktionsdomain → Vercel-Preview → lokal.
export function getBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (explicit) return explicit.replace(/\/$/, '')

  // Von Vercel automatisch gesetzt (ohne Protokoll)
  const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim()
  if (prod) return `https://${prod}`

  const preview = process.env.VERCEL_URL?.trim()
  if (preview) return `https://${preview}`

  return 'http://localhost:3000'
}
