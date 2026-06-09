import { describe, it, expect } from 'vitest'
import {
  getReadingOrderedPages,
  getReadingFocus,
  advanceReadingCursor,
  type UserPageWithJuz,
} from './reading-cycle'

function makePage(opts: {
  page_number: number
  juz: number
  status?: 'memorised' | 'recent' | 'learning'
  strength?: number
}): UserPageWithJuz {
  return {
    id: String(opts.page_number),
    user_id: 'u1',
    page_number: opts.page_number,
    status: opts.status ?? 'memorised',
    strength: opts.strength ?? 2.5,
    interval_days: 7,
    repetitions: 3,
    next_review_date: '2026-05-22',
    last_reviewed_at: null,
    progress_ayah_key: null,
    graduated_to_recent_at: null,
    pages: { juz: opts.juz, hizb: 1, surah_name: `J${opts.juz}` },
  }
}

const juz30Pages = Array.from({ length: 23 }, (_, i) =>
  makePage({ page_number: 582 + i, juz: 30 })
)
const juz29Pages = Array.from({ length: 20 }, (_, i) =>
  makePage({ page_number: 562 + i, juz: 29 })
)
const juz28Pages = Array.from({ length: 20 }, (_, i) =>
  makePage({ page_number: 542 + i, juz: 28 })
)

describe('getReadingOrderedPages', () => {
  it('orders juz descending, page ascending within juz, and excludes learning pages', () => {
    const pages = [
      makePage({ page_number: 563, juz: 29 }),
      makePage({ page_number: 562, juz: 29 }),
      makePage({ page_number: 583, juz: 30 }),
      makePage({ page_number: 582, juz: 30 }),
      makePage({ page_number: 600, juz: 30, status: 'learning' }),
    ]
    const ordered = getReadingOrderedPages(pages)
    expect(ordered.map((p) => p.page_number)).toEqual([582, 583, 562, 563])
  })
})

describe('getReadingFocus', () => {
  it('returns the whole current juz as the batch (juz 30 at cursor 0)', () => {
    const focus = getReadingFocus([...juz29Pages, ...juz30Pages], 0, 0)
    expect(focus.currentJuz).toBe(30)
    expect(focus.sessionPages).toHaveLength(juz30Pages.length)
    expect(focus.sessionPages[0].page_number).toBe(582)
    expect(focus.sessionPages[focus.sessionPages.length - 1].page_number).toBe(604)
    expect(focus.batchStart).toBe(0)
    expect(focus.cursorWithinBatch).toBe(0)
  })

  it('moves to the next juz when the cursor crosses the juz boundary', () => {
    const focus = getReadingFocus([...juz29Pages, ...juz30Pages], 23, 0)
    expect(focus.currentJuz).toBe(29)
    expect(focus.sessionPages).toHaveLength(juz29Pages.length)
    expect(focus.sessionPages[0].page_number).toBe(562)
    expect(focus.batchStart).toBe(23)
    expect(focus.cursorWithinBatch).toBe(0)
  })

  it('keeps the same juz batch when resuming mid-juz and reports cursorWithinBatch', () => {
    // 7 pages into Juz 29 — matches the exact case the user hit on
    // page 569 (Al-Ma'aarij).
    const focus = getReadingFocus([...juz29Pages, ...juz30Pages], 30, 0)
    expect(focus.currentJuz).toBe(29)
    expect(focus.sessionPages).toHaveLength(juz29Pages.length)
    expect(focus.sessionPages[0].page_number).toBe(562) // Mulk, start of juz 29
    expect(focus.cursorWithinBatch).toBe(7)
  })

  it('returns only the user’s memorised pages within a juz (handles partial juz)', () => {
    const juz29Partial = juz29Pages.slice(0, 5) // only 5 pages memorised of juz 29
    const focus = getReadingFocus([...juz29Partial, ...juz30Pages], 23, 0)
    expect(focus.currentJuz).toBe(29)
    expect(focus.sessionPages).toHaveLength(5)
  })

  it('skips an absent juz: jumps from juz 30 straight to juz 28', () => {
    const focus = getReadingFocus([...juz28Pages, ...juz30Pages], 23, 0)
    expect(focus.currentJuz).toBe(28)
    expect(focus.sessionPages[0].page_number).toBe(542)
  })

  it('returns empty session for empty hifz', () => {
    const focus = getReadingFocus([], 0, 0)
    expect(focus.sessionPages).toHaveLength(0)
    expect(focus.cycleLength).toBe(0)
    expect(focus.currentJuz).toBe(null)
  })
})

describe('advanceReadingCursor', () => {
  it('advances by completed page count', () => {
    expect(advanceReadingCursor(0, 23, 100, 0)).toEqual({ cursor: 23, loops: 0 })
  })

  it('wraps to 0 and bumps loops on completion of the cycle', () => {
    expect(advanceReadingCursor(90, 10, 100, 4)).toEqual({ cursor: 0, loops: 5 })
  })

  it('is a no-op when cycle is empty', () => {
    expect(advanceReadingCursor(0, 0, 0, 2)).toEqual({ cursor: 0, loops: 2 })
  })
})
