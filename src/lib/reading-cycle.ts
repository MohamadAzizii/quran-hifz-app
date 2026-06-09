// Daily reading cycle: walk the user's hifz one batch at a time, juz 30 first
// (top to bottom), then juz 29, then 28, etc. Each batch is READING_BATCH_SIZE
// pages (~1.5 juz). The cursor identifies both which batch and how far into it
// the user has got, so resuming opens at the same page they left off on.

import type { UserPage } from '../types'

export type UserPageWithJuz = UserPage & {
  pages: { juz: number; hizb: number; surah_name: string }
}

export const READING_BATCH_SIZE = 30 // ~1.5 juz

const isRevisionStatus = (p: UserPage) =>
  p.status === 'memorised' || p.status === 'recent'

export function getReadingOrderedPages(
  pages: UserPageWithJuz[]
): UserPageWithJuz[] {
  return pages.filter(isRevisionStatus).sort((a, b) => {
    if (a.pages.juz !== b.pages.juz) return b.pages.juz - a.pages.juz
    return a.page_number - b.page_number
  })
}

export interface ReadingFocus {
  ordered: UserPageWithJuz[]
  sessionPages: UserPageWithJuz[]
  batchStart: number
  cursorWithinBatch: number
  cycleLength: number
  loops: number
}

export function getReadingFocus(
  pages: UserPageWithJuz[],
  cursor: number,
  loops: number
): ReadingFocus {
  const ordered = getReadingOrderedPages(pages)
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
    Math.floor(effective / READING_BATCH_SIZE) * READING_BATCH_SIZE
  const sessionPages = ordered.slice(batchStart, batchStart + READING_BATCH_SIZE)
  return {
    ordered,
    sessionPages,
    batchStart,
    cursorWithinBatch: effective - batchStart,
    cycleLength: ordered.length,
    loops,
  }
}

// Advance cursor by `completed` pages, wrapping past cycleLength once if needed
// (bumping the loop counter on each wrap).
export function advanceReadingCursor(
  cursor: number,
  completed: number,
  cycleLength: number,
  loops: number
): { cursor: number; loops: number } {
  if (cycleLength <= 0) return { cursor: 0, loops }
  const next = cursor + completed
  if (next >= cycleLength) return { cursor: 0, loops: loops + 1 }
  return { cursor: next, loops }
}
