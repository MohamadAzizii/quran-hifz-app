import type { UserPage, TodaysTasks } from '../types'

// Most-overdue first, then weakest first — so nothing starves.
function byDueThenWeakest(a: UserPage, b: UserPage): number {
  if (a.next_review_date !== b.next_review_date)
    return a.next_review_date < b.next_review_date ? -1 : 1
  return a.strength - b.strength
}

// Daily revision queue composition:
//   1. All due recent-cycle pages (always included).
//   2. Up to `weakLimit` weak memorised pages (strength < 2).
//   3. The remaining budget up to `revisionLimit` filled with okay/strong
//      memorised pages.
// Anything left over stays due and rolls forward to a later day. Strength
// bands match the My Quran grid colours (>=3 strong, >=2 okay, else weak).
export function computeTodaysTasks(
  pages: UserPage[],
  today: string,
  revisionLimit = 8,
  weakLimit = 3
): TodaysTasks {
  const newPages = pages.filter((p) => p.status === 'learning')
  const isDue = (p: UserPage) => p.next_review_date <= today

  // Recent cycle: always show every due page, regardless of the cap.
  const recentPages = pages
    .filter((p) => p.status === 'recent' && isDue(p))
    .sort(byDueThenWeakest)

  const dueMemorised = pages
    .filter((p) => p.status === 'memorised' && isDue(p))
    .sort(byDueThenWeakest)

  // Budget left for memorised pages after recent has taken its share.
  const budget = Math.max(0, revisionLimit - recentPages.length)

  const weakDue = dueMemorised.filter((p) => p.strength < 2)
  const otherDue = dueMemorised.filter((p) => p.strength >= 2)

  const weakSelected = weakDue.slice(0, Math.min(weakLimit, budget))
  const otherSelected = otherDue.slice(0, budget - weakSelected.length)
  const spacedPages = [...weakSelected, ...otherSelected]

  return {
    newPages,
    recentPages,
    spacedPages,
    totalDue: newPages.length + recentPages.length + spacedPages.length,
    revisionDueTotal: recentPages.length + dueMemorised.length,
  }
}
