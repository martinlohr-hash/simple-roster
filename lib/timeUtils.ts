export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export function addMinutesToTime(time: string, minutes: number): string {
  const total = Math.max(0, Math.min(24 * 60 - 15, timeToMinutes(time) + minutes))
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}
