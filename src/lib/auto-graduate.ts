import { differenceInCalendarDays, parseISO } from 'date-fns'
import type { UserPage } from '../types'

const HEALTH_THRESHOLD = 2.5

export function pagesToGraduate(
  pages: UserPage[],
  today: string,
  recent_cycle_days: number
): UserPage[] {
  const todayDate = parseISO(today)
  return pages.filter((p) => {
    if (p.status !== 'recent') return false
    if (!p.graduated_to_recent_at) return false
    if (p.strength < HEALTH_THRESHOLD) return false
    const daysIn = differenceInCalendarDays(todayDate, parseISO(p.graduated_to_recent_at))
    return daysIn >= recent_cycle_days
  })
}
