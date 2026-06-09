import { describe, it, expect } from 'vitest'
import {
  approximateJuzMemorised,
  JUZ_PAGE_COUNTS,
  PAGES_PER_JUZ,
  type PageWithJuzMeta,
} from './juz-progress'

function makePage(opts: {
  page_number: number
  juz: number
  status?: 'memorised' | 'recent' | 'learning'
}): PageWithJuzMeta {
  return {
    id: String(opts.page_number),
    user_id: 'u1',
    page_number: opts.page_number,
    status: opts.status ?? 'memorised',
    strength: 2.5,
    interval_days: 7,
    repetitions: 3,
    next_review_date: '2026-05-22',
    last_reviewed_at: null,
    progress_ayah_key: null,
    graduated_to_recent_at: null,
    pages: { juz: opts.juz },
  }
}

describe('JUZ_PAGE_COUNTS', () => {
  it('matches the standard Madinah mushaf: 21 + 28×20 + 23 = 604', () => {
    let total = 0
    for (let j = 1; j <= 30; j++) total += JUZ_PAGE_COUNTS[j]
    expect(total).toBe(604)
  })

  it('Juz 30 has 23 pages (An-Naba to An-Nas)', () => {
    expect(JUZ_PAGE_COUNTS[30]).toBe(23)
  })

  it('uses 20 as the approximate-juz divisor', () => {
    expect(PAGES_PER_JUZ).toBe(20)
  })
})

describe('approximateJuzMemorised', () => {
  it('counts 20 memorised pages across two different juzes as 1 juz', () => {
    // 10 pages from Juz 22 (Yaseen-area) + 10 pages from Juz 18 (Nur-area).
    const yaseen10 = Array.from({ length: 10 }, (_, i) =>
      makePage({ page_number: 440 + i, juz: 22 })
    )
    const nur10 = Array.from({ length: 10 }, (_, i) =>
      makePage({ page_number: 350 + i, juz: 18 })
    )
    expect(approximateJuzMemorised([...yaseen10, ...nur10])).toBe(1)
  })

  it('floors so 30 pages is still 1 juz (not 1.5 or 2)', () => {
    const pages = Array.from({ length: 30 }, (_, i) =>
      makePage({ page_number: 100 + i, juz: 5 })
    )
    expect(approximateJuzMemorised(pages)).toBe(1)
  })

  it('40 memorised pages = 2 juz', () => {
    const pages = Array.from({ length: 40 }, (_, i) =>
      makePage({ page_number: 100 + i, juz: 5 })
    )
    expect(approximateJuzMemorised(pages)).toBe(2)
  })

  it('counts a full Juz 30 (23 pages) as 1, not 0', () => {
    const juz30 = Array.from({ length: 23 }, (_, i) =>
      makePage({ page_number: 582 + i, juz: 30 })
    )
    expect(approximateJuzMemorised(juz30)).toBe(1)
  })

  it('counts recent pages as well as memorised', () => {
    const pages = [
      ...Array.from({ length: 10 }, (_, i) =>
        makePage({ page_number: 100 + i, juz: 5, status: 'recent' })
      ),
      ...Array.from({ length: 10 }, (_, i) =>
        makePage({ page_number: 200 + i, juz: 10, status: 'memorised' })
      ),
    ]
    expect(approximateJuzMemorised(pages)).toBe(1)
  })

  it('does not count learning pages', () => {
    const pages = Array.from({ length: 25 }, (_, i) =>
      makePage({
        page_number: 100 + i,
        juz: 5,
        status: i < 10 ? 'memorised' : 'learning', // only 10 hifzed
      })
    )
    expect(approximateJuzMemorised(pages)).toBe(0) // floor(10 / 20) = 0
  })

  it('fewer than 20 memorised pages returns 0', () => {
    const pages = Array.from({ length: 19 }, (_, i) =>
      makePage({ page_number: 100 + i, juz: 5 })
    )
    expect(approximateJuzMemorised(pages)).toBe(0)
  })

  it('handles an empty hifz', () => {
    expect(approximateJuzMemorised([])).toBe(0)
  })
})
