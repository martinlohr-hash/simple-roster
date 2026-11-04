import type { Prisma } from '@/app/generated/prisma/client'

// "Noch im Team": kein Austrittsdatum oder Austritt liegt in der Zukunft.
// Archivieren setzt nur endDate (nicht status) → jede automatische Mail MUSS hierüber filtern.
export function currentTeamWhere(): Prisma.UserWhereInput {
  return { OR: [{ endDate: null }, { endDate: { gt: new Date() } }] }
}

export function isCurrentTeamMember(u: { endDate: Date | null }): boolean {
  return !u.endDate || u.endDate > new Date()
}

// Login bleibt nach Austritt noch 4 Wochen möglich (Stunden/Plan einsehen), Einstempeln nicht.
export const LOGIN_GRACE_DAYS = 28

export function isLoginBlocked(u: { endDate: Date | null }): boolean {
  if (!u.endDate) return false
  return u.endDate.getTime() + LOGIN_GRACE_DAYS * 24 * 60 * 60 * 1000 < Date.now()
}
