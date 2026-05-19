import type { UserPage, TodaysTasks } from '../types'

export function computeTodaysTasks(pages: UserPage[], today: string): TodaysTasks {
  const newPages = pages.filter((p) => p.status === 'learning')
  const recentPages = pages.filter(
    (p) => p.status === 'recent' && p.next_review_date <= today
  )
  const spacedPages = pages.filter(
    (p) => p.status === 'memorised' && p.next_review_date <= today
  )

  return {
    newPages,
    recentPages,
    spacedPages,
    totalDue: newPages.length + recentPages.length + spacedPages.length,
  }
}
