import type { UserPage } from '../types'

// Pages per juz in the standard 604-page Madinah mushaf. Juz 1 is 21 pages,
// Juz 30 is 23 (Surah An-Naba → An-Nas), and every juz in between is 20.
export const JUZ_PAGE_COUNTS: Record<number, number> = (() => {
  const counts: Record<number, number> = { 1: 21, 30: 23 }
  for (let j = 2; j <= 29; j++) counts[j] = 20
  return counts
})()

// "Approximately one juz" for the count headline — the user's mental model is
// 1 juz ≈ 20 pages, regardless of whether those pages are all in the same juz
// or spread across surahs from different juzes.
export const PAGES_PER_JUZ = 20

export type PageWithJuzMeta = UserPage & {
  pages: { juz: number }
}

const isHifzed = (p: PageWithJuzMeta) =>
  p.status === 'memorised' || p.status === 'recent'

// Aggregate page count across the whole hifz, then divide by ~20 to give a
// juz-equivalent headline. 10 pages in Juz 22 + 10 pages in Juz 18 = 20 = 1.
// Floor so the number reflects "juzes I've actually filled" rather than
// claiming a juz for being halfway through.
export function approximateJuzMemorised(pages: PageWithJuzMeta[]): number {
  const total = pages.filter(isHifzed).length
  return Math.floor(total / PAGES_PER_JUZ)
}
