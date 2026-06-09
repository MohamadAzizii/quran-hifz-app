import { describe, it, expect } from 'vitest'
import {
  countFullyMemorisedJuz,
  JUZ_PAGE_COUNTS,
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
})

describe('countFullyMemorisedJuz', () => {
  it('counts a juz as memorised only when every page is memorised or recent', () => {
    // Full Juz 30: 23 pages, all memorised.
    const fullJuz30 = Array.from({ length: 23 }, (_, i) =>
      makePage({ page_number: 582 + i, juz: 30, status: 'memorised' })
    )
    expect(countFullyMemorisedJuz(fullJuz30)).toBe(1)
  })

  it('does NOT count a juz where only some pages are memorised', () => {
    // Only 5 of 20 pages of Juz 29 memorised.
    const partialJuz29 = Array.from({ length: 5 }, (_, i) =>
      makePage({ page_number: 562 + i, juz: 29, status: 'memorised' })
    )
    expect(countFullyMemorisedJuz(partialJuz29)).toBe(0)
  })

  it('counts multiple complete juzes', () => {
    const fullJuz30 = Array.from({ length: 23 }, (_, i) =>
      makePage({ page_number: 582 + i, juz: 30, status: 'memorised' })
    )
    const fullJuz29 = Array.from({ length: 20 }, (_, i) =>
      makePage({ page_number: 562 + i, juz: 29, status: 'recent' })
    )
    expect(countFullyMemorisedJuz([...fullJuz30, ...fullJuz29])).toBe(2)
  })

  it('treats recent and memorised the same way for completeness', () => {
    // 10 recent + 10 memorised in Juz 28 = full juz of 20.
    const juz28 = [
      ...Array.from({ length: 10 }, (_, i) =>
        makePage({ page_number: 542 + i, juz: 28, status: 'recent' })
      ),
      ...Array.from({ length: 10 }, (_, i) =>
        makePage({ page_number: 552 + i, juz: 28, status: 'memorised' })
      ),
    ]
    expect(countFullyMemorisedJuz(juz28)).toBe(1)
  })

  it('does not count learning pages toward juz completeness', () => {
    const juz30 = Array.from({ length: 23 }, (_, i) =>
      makePage({
        page_number: 582 + i,
        juz: 30,
        status: i < 22 ? 'memorised' : 'learning', // 22 memorised + 1 still learning
      })
    )
    expect(countFullyMemorisedJuz(juz30)).toBe(0)
  })

  it('handles an empty hifz', () => {
    expect(countFullyMemorisedJuz([])).toBe(0)
  })
})
