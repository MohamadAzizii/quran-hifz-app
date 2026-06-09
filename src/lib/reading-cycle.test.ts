import { describe, it, expect } from 'vitest'
import {
  getReadingOrderedPages,
  getReadingFocus,
  advanceReadingCursor,
  READING_BATCH_SIZE,
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
  it('returns the first 30-page batch at cursor 0', () => {
    const pages = Array.from({ length: 60 }, (_, i) =>
      makePage({ page_number: 545 + i, juz: 29 - Math.floor(i / 20) })
    )
    const focus = getReadingFocus(pages, 0, 0)
    expect(focus.sessionPages).toHaveLength(READING_BATCH_SIZE)
    expect(focus.batchStart).toBe(0)
    expect(focus.cursorWithinBatch).toBe(0)
  })

  it('keeps the same batch when resuming mid-batch and reports cursorWithinBatch', () => {
    const pages = Array.from({ length: 60 }, (_, i) =>
      makePage({ page_number: 545 + i, juz: 30 })
    )
    const focus = getReadingFocus(pages, 5, 0)
    expect(focus.batchStart).toBe(0)
    expect(focus.cursorWithinBatch).toBe(5)
    expect(focus.sessionPages).toHaveLength(READING_BATCH_SIZE)
  })

  it('jumps to the next batch when cursor has crossed the batch boundary', () => {
    const pages = Array.from({ length: 60 }, (_, i) =>
      makePage({ page_number: 545 + i, juz: 30 })
    )
    const focus = getReadingFocus(pages, 30, 0)
    expect(focus.batchStart).toBe(30)
    expect(focus.cursorWithinBatch).toBe(0)
  })

  it('returns a shorter final batch when cycle length is not a multiple of the batch size', () => {
    const pages = Array.from({ length: 35 }, (_, i) =>
      makePage({ page_number: 545 + i, juz: 30 })
    )
    const focus = getReadingFocus(pages, 30, 0)
    expect(focus.sessionPages).toHaveLength(5)
  })

  it('returns empty session for empty hifz', () => {
    const focus = getReadingFocus([], 0, 0)
    expect(focus.sessionPages).toHaveLength(0)
    expect(focus.cycleLength).toBe(0)
  })
})

describe('advanceReadingCursor', () => {
  it('advances by completed page count', () => {
    expect(advanceReadingCursor(0, 30, 100, 0)).toEqual({ cursor: 30, loops: 0 })
  })

  it('wraps to 0 and bumps loops on completion of the cycle', () => {
    expect(advanceReadingCursor(90, 10, 100, 4)).toEqual({ cursor: 0, loops: 5 })
  })

  it('is a no-op when cycle is empty', () => {
    expect(advanceReadingCursor(0, 0, 0, 2)).toEqual({ cursor: 0, loops: 2 })
  })
})
