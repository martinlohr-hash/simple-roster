import { differenceInMinutes } from 'date-fns'

export function calcHours(checkinAt: Date, checkoutAt: Date): number {
  return differenceInMinutes(checkoutAt, checkinAt) / 60
}

export function calcLaborCost(hours: number, hourlyRate: number, overheadPercent: number): number {
  return hours * hourlyRate * (1 + overheadPercent / 100)
}

export function calcGrossHourlyCost(hourlyRate: number, overheadPercent: number): number {
  return hourlyRate * (1 + overheadPercent / 100)
}

/** Gesetzliche Mindestpause nach §4 ArbZG: 6-9h Arbeit → 30 Min, über 9h → 45 Min. */
export function requiredBreakMinutes(hours: number): number {
  if (hours > 9) return 45
  if (hours >= 6) return 30
  return 0
}

export type TrafficLightStatus = 'green' | 'yellow' | 'red'

export function getTrafficLight(actual: number, max: number | null | undefined): TrafficLightStatus {
  if (!max || max <= 0) return 'green'
  const pct = actual / max
  if (pct >= 1) return 'red'
  if (pct >= 0.8) return 'yellow'
  return 'green'
}

export type BudgetStatus = 'green' | 'warning' | 'red'

export function getBudgetStatus(actual: number, budget: number): BudgetStatus {
  if (budget <= 0) return 'green'
  const pct = actual / budget
  if (pct >= 1) return 'red'
  if (pct >= 0.9) return 'warning'
  return 'green'
}
