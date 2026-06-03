import { describe, it, expect } from 'vitest'
import {
  getCycleOrderedPages,
  getCycleFocus,
  advanceCursor,
  SESSION_PAGE_LIMIT,
  type UserPageWithJuz,
} from './recovery-plan'

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

describe('getCycleOrderedPages', () => {
  it('orders by juz descending, then page ascending within each juz', () => {
    const pages = [
      makePage({ page_number: 564, juz: 29 }),
      makePage({ page_number: 562, juz: 29 }),
      makePage({ page_number: 583, juz: 30 }),
      makePage({ page_number: 582, juz: 30 }),
    ]
    const ordered = getCycleOrderedPages(pages)
    expect(ordered.map((p) => p.page_number)).toEqual([582, 583, 562, 564])
  })

  it('excludes learning pages', () => {
    const pages = [
      makePage({ page_number: 582, juz: 30, status: 'learning' }),
      makePage({ page_number: 583, juz: 30, status: 'memorised' }),
    ]
    const ordered = getCycleOrderedPages(pages)
    expect(ordered.map((p) => p.page_number)).toEqual([583])
  })
})

describe('getCycleFocus', () => {
  it('returns the first batch starting at Juz 30 top when cursor is 0', () => {
    const juz30 = Array.from({ length: 23 }, (_, i) =>
      makePage({ page_number: 582 + i, juz: 30 })
    )
    const juz29 = Array.from({ length: 20 }, (_, i) =>
      makePage({ page_number: 562 + i, juz: 29 })
    )
    const focus = getCycleFocus([...juz29, ...juz30], 0, 0)
    expect(focus.sessionPages).toHaveLength(SESSION_PAGE_LIMIT)
    expect(focus.sessionPages[0].page_number).toBe(582)
    expect(focus.sessionPages[9].page_number).toBe(591)
    expect(focus.cycleLength).toBe(43)
    expect(focus.batchStart).toBe(0)
    expect(focus.cursorWithinBatch).toBe(0)
  })

  it('keeps the same batch when resuming mid-batch, with cursorWithinBatch reflecting progress', () => {
    const pages = Array.from({ length: 30 }, (_, i) =>
      makePage({ page_number: 582 + i, juz: 30 })
    )
    const focus = getCycleFocus(pages, 3, 0)
    // Cursor is mid-way through the first batch — still show pages 0..9.
    expect(focus.sessionPages.map((p) => p.page_number)).toEqual([
      582, 583, 584, 585, 586, 587, 588, 589, 590, 591,
    ])
    expect(focus.batchStart).toBe(0)
    expect(focus.cursorWithinBatch).toBe(3)
  })

  it('jumps to the next batch when cursor has crossed the SESSION_PAGE_LIMIT boundary', () => {
    const juz30 = Array.from({ length: 23 }, (_, i) =>
      makePage({ page_number: 582 + i, juz: 30 })
    )
    const focus = getCycleFocus(juz30, 10, 0)
    expect(focus.sessionPages[0].page_number).toBe(592)
    expect(focus.sessionPages[9].page_number).toBe(601)
    expect(focus.batchStart).toBe(10)
    expect(focus.cursorWithinBatch).toBe(0)
  })

  it('can produce a batch that spans juz boundaries', () => {
    const juz30 = Array.from({ length: 23 }, (_, i) =>
      makePage({ page_number: 582 + i, juz: 30 })
    )
    const juz29 = Array.from({ length: 20 }, (_, i) =>
      makePage({ page_number: 562 + i, juz: 29 })
    )
    const focus = getCycleFocus([...juz29, ...juz30], 20, 0)
    // Batch [20..29] = last 3 of Juz 30 + first 7 of Juz 29.
    expect(focus.sessionPages.map((p) => p.page_number)).toEqual([
      602, 603, 604, 562, 563, 564, 565, 566, 567, 568,
    ])
    expect(focus.batchStart).toBe(20)
  })

  it('returns a shorter final batch when the cycle length is not a multiple of 10', () => {
    const pages = Array.from({ length: 12 }, (_, i) =>
      makePage({ page_number: 582 + i, juz: 30 })
    )
    const focus = getCycleFocus(pages, 10, 0)
    expect(focus.sessionPages).toHaveLength(2) // ordered[10..11]
    expect(focus.batchStart).toBe(10)
    expect(focus.cursorWithinBatch).toBe(0)
  })

  it('clamps an out-of-range cursor into the valid range', () => {
    const pages = Array.from({ length: 10 }, (_, i) =>
      makePage({ page_number: 582 + i, juz: 30 })
    )
    const focus = getCycleFocus(pages, 100, 0)
    expect(focus.batchStart).toBe(0)
    expect(focus.cursorWithinBatch).toBe(0)
  })

  it('handles an empty hifz', () => {
    const focus = getCycleFocus([], 0, 0)
    expect(focus.sessionPages).toHaveLength(0)
    expect(focus.cycleLength).toBe(0)
  })
})

describe('advanceCursor', () => {
  it('advances by the number of pages completed', () => {
    expect(advanceCursor(0, 10, 50, 0)).toEqual({ cursor: 10, loops: 0 })
  })

  it('wraps to 0 and increments loops when reaching the end of the cycle', () => {
    expect(advanceCursor(45, 10, 50, 2)).toEqual({ cursor: 0, loops: 3 })
  })

  it('wraps when finishing a shorter end-of-cycle session', () => {
    expect(advanceCursor(48, 2, 50, 0)).toEqual({ cursor: 0, loops: 1 })
  })

  it('is a no-op when the cycle is empty', () => {
    expect(advanceCursor(0, 0, 0, 5)).toEqual({ cursor: 0, loops: 5 })
  })
})
