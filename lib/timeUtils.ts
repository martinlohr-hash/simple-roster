export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

/** Schichtdauer in Stunden. Endzeit <= Startzeit = Schicht läuft über Mitternacht in den Folgetag. */
export function shiftDurationHours(startTime: string, endTime: string): number {
  let diff = timeToMinutes(endTime) - timeToMinutes(startTime)
  if (diff <= 0) diff += 24 * 60
  return diff / 60
}

export function addMinutesToTime(time: string, minutes: number): string {
  const total = Math.max(0, Math.min(24 * 60 - 15, timeToMinutes(time) + minutes))
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}
