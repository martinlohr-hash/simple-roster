// Rechtlicher Firmenname (Vertragspartner) – für Arbeitsvertrag, Kündigung und
// Personalbogen-Export. Über NEXT_PUBLIC_COMPANY_NAME überschreibbar.
export const COMPANY_NAME = process.env.NEXT_PUBLIC_COMPANY_NAME || 'Simple Sandwich Hamburg GmbH'

// Marken-/Anzeigename für die freundliche Kommunikation (E-Mails, {{firma}}).
// Bewusst getrennt vom rechtlichen COMPANY_NAME. Über NEXT_PUBLIC_COMPANY_BRAND überschreibbar.
export const COMPANY_BRAND = process.env.NEXT_PUBLIC_COMPANY_BRAND || 'Simple Sandwiches'

// Empfänger fürs Lohnbüro (Neu-/Abmeldungen). Standard fest hinterlegt, per Env
// überschreibbar. Lebt hier (nicht in app/actions/personalbogen.ts), weil eine
// "use server"-Datei ausschließlich async Funktionen exportieren darf – ein
// String-Export dort lässt den Vercel-Build mit "found string" scheitern.
export const PAYROLL_EMAIL = process.env.PAYROLL_EMAIL || 'info@optilohn.de'
