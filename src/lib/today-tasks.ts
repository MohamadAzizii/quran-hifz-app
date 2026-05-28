import type { UserPage, TodaysTasks } from '../types'

// Most-overdue first, then weakest first — so nothing starves.
function byDueThenWeakest(a: UserPage, b: UserPage): number {
  if (a.next_review_date !== b.next_review_date)
    return a.next_review_date < b.next_review_date ? -1 : 1
  return a.strength - b.strength
}

// Daily revision queue:
//   - Every due recent-cycle page is always shown.
//   - Every memorised page that was already due before today (carried over from
//     a previous day you didn't finish) is always shown. The pile from yesterday
//     persists until you actually do it.
//   - With the remaining budget up to `revisionLimit`, today's newly-due
//     memorised pages are added: up to `weakLimit` weak ones (strength < 2),
//     the rest filled with okay/strong. Anything that doesn't fit waits for
//     tomorrow.
// Strength bands match the My Quran grid colours (>=3 strong, >=2 okay, else weak).
export function computeTodaysTasks(
  pages: UserPage[],
  today: string,
  revisionLimit = 8,
  weakLimit = 3
): TodaysTasks {
  const newPages = pages.filter((p) => p.status === 'learning')

  const recentPages = pages
    .filter((p) => p.status === 'recent' && p.next_review_date <= today)
    .sort(byDueThenWeakest)

  // Carried-over memorised pages: due strictly before today. Always shown so
  // the pile rolls forward intact until the user clears it.
  const carriedMemorised = pages
    .filter((p) => p.status === 'memorised' && p.next_review_date < today)
    .sort(byDueThenWeakest)

  // Freshly-due memorised pages: due today for the first time. Subject to the
  // daily cap and 3-weak composition rule.
  const freshMemorised = pages
    .filter((p) => p.status === 'memorised' && p.next_review_date === today)
    .sort(byDueThenWeakest)

  const used = recentPages.length + carriedMemorised.length
  const budget = Math.max(0, revisionLimit - used)

  const weakFresh = freshMemorised.filter((p) => p.strength < 2)
  const otherFresh = freshMemorised.filter((p) => p.strength >= 2)
  const weakSelected = weakFresh.slice(0, Math.min(weakLimit, budget))
  const otherSelected = otherFresh.slice(0, budget - weakSelected.length)

  const spacedPages = [...carriedMemorised, ...weakSelected, ...otherSelected]
  const revisionDueTotal =
    recentPages.length + carriedMemorised.length + freshMemorised.length
  const revisionCarriedTotal =
    recentPages.filter((p) => p.next_review_date < today).length +
    carriedMemorised.length

  return {
    newPages,
    recentPages,
    spacedPages,
    totalDue: newPages.length + recentPages.length + spacedPages.length,
    revisionDueTotal,
    revisionCarriedTotal,
  }
}
