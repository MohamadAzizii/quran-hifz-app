import type { UserPage, TodaysTasks } from '../types'

// A hard daily cap on revision (recent + spaced combined). Due pages beyond
// the cap are left due and simply surface on a later day — the queue rolls
// forward. Most-overdue pages go first, then recent before spaced, then
// weakest first, so nothing starves.
export function computeTodaysTasks(
  pages: UserPage[],
  today: string,
  revisionLimit = 8
): TodaysTasks {
  const newPages = pages.filter((p) => p.status === 'learning')

  const dueRevision = pages
    .filter(
      (p) =>
        (p.status === 'recent' || p.status === 'memorised') &&
        p.next_review_date <= today
    )
    .sort((a, b) => {
      if (a.next_review_date !== b.next_review_date)
        return a.next_review_date < b.next_review_date ? -1 : 1
      if (a.status !== b.status) return a.status === 'recent' ? -1 : 1
      return a.strength - b.strength
    })

  const capped =
    revisionLimit > 0 ? dueRevision.slice(0, revisionLimit) : dueRevision

  const recentPages = capped.filter((p) => p.status === 'recent')
  const spacedPages = capped.filter((p) => p.status === 'memorised')

  return {
    newPages,
    recentPages,
    spacedPages,
    totalDue: newPages.length + recentPages.length + spacedPages.length,
    revisionDueTotal: dueRevision.length,
  }
}
