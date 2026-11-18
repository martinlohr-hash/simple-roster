/**
 * Welche Standorte ins Personalkosten-Budget zählen. Event-Schichten sind
 * ausgenommen – die werden über das Event selbst mitfinanziert. Das Budget
 * deckt damit nur den Laden (Weidenallee) ab.
 */
export function isBudgetLocation(name: string): boolean {
  return name.trim().toLowerCase() !== 'event'
}

export function budgetLocationIds(locations: { id: string; name: string }[]): string[] {
  return locations.filter((l) => isBudgetLocation(l.name)).map((l) => l.id)
}

export function budgetScopeLabel(locations: { id: string; name: string }[]): string {
  return locations.filter((l) => isBudgetLocation(l.name)).map((l) => l.name).join(' + ')
}
