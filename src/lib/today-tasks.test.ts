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
  it('puts learning pages in newPages regardless of next_review_date', () => {
    const pages = [makePage({ status: 'learning', next_review_date: '2099-01-01' })]
    const result = computeTodaysTasks(pages, today)
    expect(result.newPages).toHaveLength(1)
    expect(result.recentPages).toHaveLength(0)
  })

  it('caps recent pages at 2, most overdue first', () => {
    const pages = [
      makePage({ page_number: 1, status: 'recent', next_review_date: today }),
      makePage({ page_number: 2, status: 'recent', next_review_date: '2026-05-15' }),
      makePage({ page_number: 3, status: 'recent', next_review_date: '2026-05-10' }),
      makePage({ page_number: 4, status: 'recent', next_review_date: '2026-05-12' }),
    ]
    const result = computeTodaysTasks(pages, today)
    expect(result.recentPages.map((p) => p.page_number)).toEqual([3, 4])
  })

  it('excludes future-dated recent pages', () => {
    const pages = [
      makePage({ page_number: 1, status: 'recent', next_review_date: today }),
      makePage({ page_number: 2, status: 'recent', next_review_date: '2099-01-01' }),
    ]
    const result = computeTodaysTasks(pages, today)
    expect(result.recentPages).toHaveLength(1)
  })

  it('picks 1 most overdue + 1 weakest memorised page', () => {
    const pages = [
      makePage({ page_number: 100, status: 'memorised', next_review_date: '2026-05-10', strength: 3 }),
      makePage({ page_number: 101, status: 'memorised', next_review_date: '2026-05-15', strength: 1.4 }),
      makePage({ page_number: 102, status: 'memorised', next_review_date: today, strength: 2.5 }),
    ]
    const result = computeTodaysTasks(pages, today)
    const numbers = result.spacedPages.map((p) => p.page_number)
    expect(numbers).toContain(100) // most overdue
    expect(numbers).toContain(101) // weakest
    expect(numbers).not.toContain(102)
    expect(result.spacedPages).toHaveLength(2)
  })

  it('returns a single algorithm pick when only one memorised page is due', () => {
    const pages = [
      makePage({ page_number: 200, status: 'memorised', next_review_date: '2026-05-10', strength: 1.3 }),
      makePage({ page_number: 201, status: 'memorised', next_review_date: '2030-01-01', strength: 3 }),
    ]
    const result = computeTodaysTasks(pages, today)
    expect(result.spacedPages.map((p) => p.page_number)).toEqual([200])
  })

  it('still fills the second algorithm slot when most-overdue == weakest, using the next-best page', () => {
    const pages = [
      makePage({ page_number: 200, status: 'memorised', next_review_date: '2026-05-10', strength: 1.3 }),
      makePage({ page_number: 201, status: 'memorised', next_review_date: today, strength: 3 }),
    ]
    const result = computeTodaysTasks(pages, today)
    // 200 is both most-overdue and weakest — still pick 201 for the 2nd slot.
    expect(result.spacedPages).toHaveLength(2)
    expect(result.spacedPages.map((p) => p.page_number)).toEqual([200, 201])
  })

  it('excludes memorised pages whose next_review_date is in the future', () => {
    const pages = [
      makePage({ page_number: 300, status: 'memorised', next_review_date: '2030-01-01' }),
    ]
    const result = computeTodaysTasks(pages, today)
    expect(result.spacedPages).toHaveLength(0)
  })

  it('combined revision pages cap at 4 (2 recent + 2 algorithm)', () => {
    const pages = [
      ...Array.from({ length: 5 }, (_, i) =>
        makePage({ page_number: i + 1, status: 'recent', next_review_date: today })
      ),
      ...Array.from({ length: 10 }, (_, i) =>
        makePage({
          page_number: 100 + i,
          status: 'memorised',
          next_review_date: today,
          strength: 2 + i * 0.1,
        })
      ),
    ]
    const result = computeTodaysTasks(pages, today)
    expect(result.recentPages).toHaveLength(2)
    expect(result.spacedPages).toHaveLength(2)
    expect(result.recentPages.length + result.spacedPages.length).toBe(4)
  })

  it('totalDue counts new + recent + spaced', () => {
    const pages = [
      makePage({ page_number: 1, status: 'learning' }),
      makePage({ page_number: 2, status: 'recent', next_review_date: today }),
      makePage({ page_number: 3, status: 'memorised', next_review_date: today, strength: 1.5 }),
    ]
    const result = computeTodaysTasks(pages, today)
    expect(result.totalDue).toBe(3)
  })
})
