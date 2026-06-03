// Hifz Recovery Plan cycle.
//
// Order: juz descending (Juz 30 first), ascending page within each juz. So the
// cycle walks Juz 30 top-to-bottom, then Juz 29 top-to-bottom, and so on,
// over only the pages the user actually has in their hifz.
//
// Each session = the next SESSION_PAGE_LIMIT pages from the cursor (10 by
// default, "10 pages, 10 reps each" per the plan). Cursor advances only when
// the session is finished — skipping a day leaves the same pages waiting. When
// the cursor wraps past the end of the cycle, loops bumps by 1 and the user
// restarts from Juz 30.

import type { UserPage } from '../types'

export type UserPageWithJuz = UserPage & {
  pages: { juz: number; hizb: number; surah_name: string }
}

export const SESSION_PAGE_LIMIT = 10

const isRevisionStatus = (p: UserPage) =>
  p.status === 'memorised' || p.status === 'recent'

export function getCycleOrderedPages(
  pages: UserPageWithJuz[]
): UserPageWithJuz[] {
  return pages.filter(isRevisionStatus).sort((a, b) => {
    if (a.pages.juz !== b.pages.juz) return b.pages.juz - a.pages.juz
    return a.page_number - b.page_number
  })
}

export interface CycleFocus {
  ordered: UserPageWithJuz[]
  sessionPages: UserPageWithJuz[]
  batchStart: number // index in the cycle where this batch begins (multiple of SESSION_PAGE_LIMIT)
  cursorWithinBatch: number // how many pages of this batch are already done
  cycleLength: number
  loops: number
}

// Batches are fixed slices of the cycle ([0..10), [10..20), ...). The cursor
// determines both which batch the user is in (floor / SESSION_PAGE_LIMIT) and
// where within it they are. Resuming a session always loads the same batch
// until it's finished — the in-batch position is what changes.
export function getCycleFocus(
  pages: UserPageWithJuz[],
  cursor: number,
  loops: number
): CycleFocus {
  const ordered = getCycleOrderedPages(pages)
  if (ordered.length === 0) {
    return {
      ordered,
      sessionPages: [],
      batchStart: 0,
      cursorWithinBatch: 0,
      cycleLength: 0,
      loops,
    }
  }
  const effective = ((cursor % ordered.length) + ordered.length) % ordered.length
  const batchStart =
    Math.floor(effective / SESSION_PAGE_LIMIT) * SESSION_PAGE_LIMIT
  const sessionPages = ordered.slice(batchStart, batchStart + SESSION_PAGE_LIMIT)
  return {
    ordered,
    sessionPages,
    batchStart,
    cursorWithinBatch: effective - batchStart,
    cycleLength: ordered.length,
    loops,
  }
}

// After completing a session of N pages: advance cursor by N. If that lands at
// or past the end of the cycle, wrap to 0 and bump the loop counter.
export function advanceCursor(
  cursor: number,
  completed: number,
  cycleLength: number,
  loops: number
): { cursor: number; loops: number } {
  if (cycleLength <= 0) return { cursor: 0, loops }
  const next = cursor + completed
  if (next >= cycleLength) {
    return { cursor: 0, loops: loops + 1 }
  }
  return { cursor: next, loops }
}
