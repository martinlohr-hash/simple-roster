import {
  SCHEDULE_START_HOUR,
  PX_PER_MINUTE,
  SNAP_MINUTES,
  SCHEDULE_TOTAL_MINUTES,
} from './schedule-constants'

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return (h - SCHEDULE_START_HOUR) * 60 + m
}

export function minutesToTime(minutes: number): string {
  const totalMinutes = SCHEDULE_START_HOUR * 60 + minutes
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function snapToGrid(minutes: number): number {
  return Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES
}

export function minutesToPx(minutes: number): number {
  return minutes * PX_PER_MINUTE
}

export function pxToMinutes(px: number): number {
  return px / PX_PER_MINUTE
}

export function clampMinutes(minutes: number): number {
  return Math.max(0, Math.min(SCHEDULE_TOTAL_MINUTES, minutes))
}
