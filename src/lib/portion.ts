import type { AyahCache, DailyTarget } from '../types'

const FRACTIONS: Record<DailyTarget, number> = {
  quarter: 0.25,
  half: 0.5,
  one: 1,
  two: 2, // capped at 1 page per portion in this function
}

export interface Portion {
  ayahs: AyahCache[]
  isLastPortion: boolean
}

export function nextPortion(
  pageAyahs: AyahCache[],
  progress_ayah_key: string | null,
  daily_target: DailyTarget
): Portion {
  const sorted = [...pageAyahs].sort((a, b) => a.ayah_ordinal - b.ayah_ordinal)
  const startIdx = progress_ayah_key
    ? sorted.findIndex((a) => a.ayah_key === progress_ayah_key) + 1
    : 0
  if (startIdx >= sorted.length) {
    return { ayahs: [], isLastPortion: true }
  }
  const portionSize = Math.max(
    1,
    Math.ceil(sorted.length * Math.min(1, FRACTIONS[daily_target]))
  )
  const endIdx = Math.min(sorted.length, startIdx + portionSize)
  return {
    ayahs: sorted.slice(startIdx, endIdx),
    isLastPortion: endIdx >= sorted.length,
  }
}
