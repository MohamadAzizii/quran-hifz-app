import { describe, it, expect } from 'vitest'
import { getTodaysFocus, SESSION_PAGE_LIMIT, type UserPageWithJuz } from './recovery-plan'

function makePage(
  overrides: Partial<UserPageWithJuz> & { page_number: number; juz: number }
): UserPageWithJuz {
  const { page_number, juz, pages: pagesOverride, ...rest } = overrides
  return {
    id: String(page_number),
    user_id: 'u1',
    page_number,
    status: 'memorised',
    strength: 2.5,
    interval_days: 7,
    repetitions: 3,
    next_review_date: '2026-05-22',
    last_reviewed_at: null,
    progress_ayah_key: null,
    graduated_to_recent_at: null,
    ...rest,
    pages: {
      juz,
      hizb: 1,
      surah_name: 'Test',
      ...pagesOverride,
    },
  }
}

// Specific weekdays in 2026:
const SUNDAY = new Date('2026-05-24T12:00:00Z')
const MONDAY = new Date('2026-05-25T12:00:00Z')
const TUESDAY = new Date('2026-05-26T12:00:00Z')
const WEDNESDAY = new Date('2026-05-27T12:00:00Z')
const THURSDAY = new Date('2026-05-28T12:00:00Z')
const FRIDAY = new Date('2026-05-29T12:00:00Z')
const SATURDAY = new Date('2026-05-30T12:00:00Z')

describe('getTodaysFocus weekday mapping', () => {
  const pages: UserPageWithJuz[] = [
    makePage({ page_number: 582, juz: 30 }),
    makePage({ page_number: 562, juz: 29 }),
    makePage({ page_number: 542, juz: 28 }),
    makePage({ page_number: 522, juz: 27 }),
    makePage({ page_number: 502, juz: 26 }),
  ]

  it.each([
    [SATURDAY, 'Juz 30', 30],
    [SUNDAY, 'Juz 30', 30],
    [MONDAY, 'Juz 29', 29],
    [TUESDAY, 'Juz 28', 28],
    [WEDNESDAY, 'Juz 27', 27],
    [THURSDAY, 'Juz 26', 26],
  ])('maps %s to %s', (date, expectedLabel, expectedJuz) => {
    const focus = getTodaysFocus(pages, date as Date)
    expect(focus.focusLabel).toBe(expectedLabel)
    expect(focus.juz).toBe(expectedJuz)
    expect(focus.sessionPages).toHaveLength(1)
  })

  it('treats Friday as the weak surah day (Yaseen + fragile)', () => {
    const focus = getTodaysFocus(pages, FRIDAY)
    expect(focus.focusLabel).toBe('Yaseen + weak surahs')
    expect(focus.isWeakDay).toBe(true)
  })
})

describe('getTodaysFocus selection rules', () => {
  it('only includes memorised or recent pages, skipping learning', () => {
    const pages: UserPageWithJuz[] = [
      makePage({ page_number: 582, juz: 30, status: 'memorised' }),
      makePage({ page_number: 583, juz: 30, status: 'recent' }),
      makePage({ page_number: 584, juz: 30, status: 'learning' }),
    ]
    const focus = getTodaysFocus(pages, SATURDAY)
    expect(focus.sessionPages.map((p) => p.page_number)).toEqual([582, 583])
  })

  it('sorts weakest first within a juz', () => {
    const pages: UserPageWithJuz[] = [
      makePage({ page_number: 582, juz: 30, strength: 3.5 }),
      makePage({ page_number: 583, juz: 30, strength: 1.5 }),
      makePage({ page_number: 584, juz: 30, strength: 2.5 }),
    ]
    const focus = getTodaysFocus(pages, SATURDAY)
    expect(focus.sessionPages.map((p) => p.strength)).toEqual([1.5, 2.5, 3.5])
  })

  it('caps the session at SESSION_PAGE_LIMIT pages and reports totalAvailable', () => {
    const pages: UserPageWithJuz[] = Array.from({ length: 18 }, (_, i) =>
      makePage({ page_number: 580 + i, juz: 30 })
    )
    const focus = getTodaysFocus(pages, SATURDAY)
    expect(focus.sessionPages).toHaveLength(SESSION_PAGE_LIMIT)
    expect(focus.totalAvailable).toBe(18)
  })

  it('on Friday combines Yaseen pages and weak pages from elsewhere', () => {
    const pages: UserPageWithJuz[] = [
      // Yaseen pages (440-445), strong
      makePage({ page_number: 440, juz: 22, strength: 4 }),
      makePage({ page_number: 441, juz: 23, strength: 4 }),
      // weak pages in unrelated juz
      makePage({ page_number: 200, juz: 10, strength: 1.4 }),
      makePage({ page_number: 300, juz: 15, strength: 1.7 }),
      // strong page (should be excluded — not Yaseen, not weak)
      makePage({ page_number: 100, juz: 5, strength: 3.5 }),
    ]
    const focus = getTodaysFocus(pages, FRIDAY)
    const numbers = focus.sessionPages.map((p) => p.page_number)
    expect(numbers).toContain(440)
    expect(numbers).toContain(441)
    expect(numbers).toContain(200)
    expect(numbers).toContain(300)
    expect(numbers).not.toContain(100)
  })

  it('returns an empty session when no pages match the focus', () => {
    const pages: UserPageWithJuz[] = [
      makePage({ page_number: 100, juz: 5 }),
    ]
    const focus = getTodaysFocus(pages, SATURDAY)
    expect(focus.sessionPages).toHaveLength(0)
    expect(focus.totalAvailable).toBe(0)
  })
})
