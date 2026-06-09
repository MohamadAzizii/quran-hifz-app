import type { UserPage, TodaysTasks } from '../types'

// Algorithm-picked revision: at most 4 pages a day.
//   - Up to 2 due recent-cycle pages (most overdue first).
//   - Plus up to 2 memorised pages picked by the SM-2 algorithm:
//       * the single most overdue memorised page, and
//       * the single weakest memorised page (lowest strength).
// If those two algorithm picks happen to be the same page, only one slot is
// used (no duplicates).
export function computeTodaysTasks(
  pages: UserPage[],
  today: string
): TodaysTasks {
  const newPages = pages.filter((p) => p.status === 'learning')
  const isDue = (p: UserPage) => p.next_review_date <= today

  const recentPages = pages
    .filter((p) => p.status === 'recent' && isDue(p))
    .sort((a, b) => {
      if (a.next_review_date !== b.next_review_date)
        return a.next_review_date < b.next_review_date ? -1 : 1
      return a.strength - b.strength
    })
    .slice(0, 2)

  const memorisedDue = pages.filter(
    (p) => p.status === 'memorised' && isDue(p)
  )
  const byOverdue = [...memorisedDue].sort((a, b) =>
    a.next_review_date < b.next_review_date ? -1 : 1
  )
  const byWeakest = [...memorisedDue].sort((a, b) => a.strength - b.strength)

  const spacedPages: UserPage[] = []
  const mostOverdue = byOverdue[0]
  if (mostOverdue) spacedPages.push(mostOverdue)
  const weakest = byWeakest.find(
    (p) => p.page_number !== mostOverdue?.page_number
  )
  if (weakest) spacedPages.push(weakest)

  return {
    newPages,
    recentPages,
    spacedPages,
    totalDue: newPages.length + recentPages.length + spacedPages.length,
  }
}
