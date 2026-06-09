import type { UserPage } from '../types'

// Pages per juz in the standard 604-page Madinah mushaf. Juz 1 is 21 pages,
// Juz 30 is 23 (Surah An-Naba → An-Nas), and every juz in between is 20.
export const JUZ_PAGE_COUNTS: Record<number, number> = (() => {
  const counts: Record<number, number> = { 1: 21, 30: 23 }
  for (let j = 2; j <= 29; j++) counts[j] = 20
  return counts
})()

export type PageWithJuzMeta = UserPage & {
  pages: { juz: number }
}

// A juz counts as "memorised" only when EVERY page in that juz is memorised
// (or recent — both states are post-memorisation). Partial-juz progress
// does not bump the juz counter.
export function countFullyMemorisedJuz(pages: PageWithJuzMeta[]): number {
  const completeByJuz = new Map<number, number>()
  for (const p of pages) {
    if (p.status !== 'memorised' && p.status !== 'recent') continue
    completeByJuz.set(p.pages.juz, (completeByJuz.get(p.pages.juz) ?? 0) + 1)
  }
  let count = 0
  for (const [juz, n] of completeByJuz) {
    if (n >= (JUZ_PAGE_COUNTS[juz] ?? Infinity)) count++
  }
  return count
}
