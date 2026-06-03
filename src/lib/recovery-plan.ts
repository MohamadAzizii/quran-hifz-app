// Today's focus for the Hifz Recovery Plan: pick which of the user's pages
// they should revise today, based on the day of the week.
//
// Weekly structure (matches the plan card):
//   Sat → Juz 30
//   Sun → Juz 30
//   Mon → Juz 29
//   Tue → Juz 28
//   Wed → Juz 27
//   Thu → Juz 26
//   Fri → Full weak surah day — Yaseen + anything fragile
//
// Only memorised/recent pages count as "revision" material; learning pages
// belong to the memorisation flow. Within the focus, weakest first.

import type { UserPage } from '../types'

export type UserPageWithJuz = UserPage & {
  pages: { juz: number; hizb: number; surah_name: string }
}

export const SESSION_PAGE_LIMIT = 10

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

// 0 = Sun ... 6 = Sat
const FOCUS_BY_WEEKDAY: Record<
  number,
  { kind: 'juz'; juz: number } | { kind: 'friday' }
> = {
  0: { kind: 'juz', juz: 30 },
  1: { kind: 'juz', juz: 29 },
  2: { kind: 'juz', juz: 28 },
  3: { kind: 'juz', juz: 27 },
  4: { kind: 'juz', juz: 26 },
  5: { kind: 'friday' },
  6: { kind: 'juz', juz: 30 },
}

// Yaseen = surah 36, pages 440–445 (Madinah mushaf).
const YASEEN_START = 440
const YASEEN_END = 445

const isYaseen = (page: number) => page >= YASEEN_START && page <= YASEEN_END

const isRevisionStatus = (p: UserPage) =>
  p.status === 'memorised' || p.status === 'recent'

const byWeakestThenPage = (a: UserPage, b: UserPage) =>
  a.strength - b.strength || a.page_number - b.page_number

export interface TodaysFocus {
  weekday: number
  dayName: string
  focusLabel: string
  juz?: number
  surahName?: string
  isWeakDay: boolean
  candidatePages: UserPageWithJuz[]
  sessionPages: UserPageWithJuz[]
  totalAvailable: number
}

export function getTodaysFocus(
  pages: UserPageWithJuz[],
  date: Date = new Date()
): TodaysFocus {
  const weekday = date.getDay()
  const dayName = DAY_NAMES[weekday]
  const config = FOCUS_BY_WEEKDAY[weekday]

  if (config.kind === 'friday') {
    const yaseenPages = pages
      .filter((p) => isRevisionStatus(p) && isYaseen(p.page_number))
      .sort((a, b) => a.page_number - b.page_number)
    const weakPages = pages
      .filter(
        (p) =>
          isRevisionStatus(p) && p.strength < 2 && !isYaseen(p.page_number)
      )
      .sort(byWeakestThenPage)
    const candidates = [...yaseenPages, ...weakPages]
    return {
      weekday,
      dayName,
      focusLabel: 'Yaseen + weak surahs',
      surahName: 'Yaseen',
      isWeakDay: true,
      candidatePages: candidates,
      sessionPages: candidates.slice(0, SESSION_PAGE_LIMIT),
      totalAvailable: candidates.length,
    }
  }

  const juz = config.juz
  const candidates = pages
    .filter((p) => isRevisionStatus(p) && p.pages.juz === juz)
    .sort(byWeakestThenPage)
  return {
    weekday,
    dayName,
    focusLabel: `Juz ${juz}`,
    juz,
    isWeakDay: false,
    candidatePages: candidates,
    sessionPages: candidates.slice(0, SESSION_PAGE_LIMIT),
    totalAvailable: candidates.length,
  }
}
