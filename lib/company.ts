// Rechtlicher Firmenname (Vertragspartner) – für Arbeitsvertrag, Kündigung und
// Personalbogen-Export. Über NEXT_PUBLIC_COMPANY_NAME überschreibbar.
export const COMPANY_NAME = process.env.NEXT_PUBLIC_COMPANY_NAME || 'Simple Sandwich Hamburg GmbH'

// Marken-/Anzeigename für die freundliche Kommunikation (E-Mails, {{firma}}).
// Bewusst getrennt vom rechtlichen COMPANY_NAME. Über NEXT_PUBLIC_COMPANY_BRAND überschreibbar.
export const COMPANY_BRAND = process.env.NEXT_PUBLIC_COMPANY_BRAND || 'Simple Sandwiches'
