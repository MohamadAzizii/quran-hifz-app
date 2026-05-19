import { describe, it, expect } from 'vitest'
import { computeTodaysTasks } from './today-tasks'
import type { UserPage } from '../types'

const today = '2026-05-19'

function makePage(overrides: Partial<UserPage>): UserPage {
  return {
    id: '1',
    user_id: 'u1',
    page_number: 1,
    status: 'memorised',
    strength: 2.5,
    interval_days: 7,
    repetitions: 3,
    next_review_date: today,
    last_reviewed_at: null,
    progress_ayah_key: null,
    graduated_to_recent_at: null,
    ...overrides,
  }
}

describe('computeTodaysTasks', () => {
  it('includes learning pages in newPages regardless of next_review_date', () => {
    const pages = [makePage({ status: 'learning', next_review_date: '2099-01-01' })]
    const result = computeTodaysTasks(pages, today)
    expect(result.newPages).toHaveLength(1)
    expect(result.recentPages).toHaveLength(0)
  })

  it('includes recent pages due today or earlier', () => {
    const pages = [
      makePage({ page_number: 1, status: 'recent', next_review_date: today }),
      makePage({ page_number: 2, status: 'recent', next_review_date: '2026-05-20' }),
    ]
    const result = computeTodaysTasks(pages, today)
    expect(result.recentPages).toHaveLength(1)
    expect(result.recentPages[0].page_number).toBe(1)
  })

  it('includes memorised pages due today or earlier in spacedPages', () => {
    const pages = [
      makePage({ page_number: 1, status: 'memorised', next_review_date: today }),
      makePage({ page_number: 2, status: 'memorised', next_review_date: '2026-05-18' }),
      makePage({ page_number: 3, status: 'memorised', next_review_date: '2026-05-20' }),
    ]
    const result = computeTodaysTasks(pages, today)
    expect(result.spacedPages).toHaveLength(2)
  })

  it('computes totalDue correctly', () => {
    const pages = [
      makePage({ page_number: 1, status: 'learning' }),
      makePage({ page_number: 2, status: 'recent', next_review_date: today }),
      makePage({ page_number: 3, status: 'memorised', next_review_date: today }),
    ]
    const result = computeTodaysTasks(pages, today)
    expect(result.totalDue).toBe(3)
  })

  it('does not include memorised pages whose next_review_date is in future', () => {
    const pages = [
      makePage({ page_number: 1, status: 'memorised', next_review_date: '2030-01-01' }),
    ]
    const result = computeTodaysTasks(pages, today)
    expect(result.spacedPages).toHaveLength(0)
    expect(result.totalDue).toBe(0)
  })
})
