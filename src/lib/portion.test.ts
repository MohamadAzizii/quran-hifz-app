import { describe, it, expect } from 'vitest'
import { nextPortion } from './portion'
import type { AyahCache } from '../types'

function ayahs(keys: string[]): AyahCache[] {
  return keys.map((k, i) => ({
    page_number: 1,
    ayah_key: k,
    ayah_ordinal: i + 1,
    text_uthmani: '...',
  }))
}

describe('nextPortion', () => {
  const page = ayahs(['2:1', '2:2', '2:3', '2:4', '2:5', '2:6', '2:7', '2:8'])

  it('quarter target on fresh page returns first 2 ayahs', () => {
    const portion = nextPortion(page, null, 'quarter')
    expect(portion.ayahs.map((a) => a.ayah_key)).toEqual(['2:1', '2:2'])
    expect(portion.isLastPortion).toBe(false)
  })

  it('half target on fresh page returns first 4 ayahs', () => {
    const portion = nextPortion(page, null, 'half')
    expect(portion.ayahs.map((a) => a.ayah_key)).toEqual(['2:1', '2:2', '2:3', '2:4'])
  })

  it('one (full page) target returns whole page', () => {
    const portion = nextPortion(page, null, 'one')
    expect(portion.ayahs).toHaveLength(8)
    expect(portion.isLastPortion).toBe(true)
  })

  it('continues from progress_ayah_key for quarter target', () => {
    const portion = nextPortion(page, '2:2', 'quarter')
    expect(portion.ayahs.map((a) => a.ayah_key)).toEqual(['2:3', '2:4'])
  })

  it('marks last portion when remainder is small', () => {
    const portion = nextPortion(page, '2:6', 'quarter')
    expect(portion.ayahs.map((a) => a.ayah_key)).toEqual(['2:7', '2:8'])
    expect(portion.isLastPortion).toBe(true)
  })

  it('returns empty portion when page is complete', () => {
    const portion = nextPortion(page, '2:8', 'quarter')
    expect(portion.ayahs).toHaveLength(0)
    expect(portion.isLastPortion).toBe(true)
  })

  it('two target on a single page is still capped at end of page', () => {
    const portion = nextPortion(page, null, 'two')
    expect(portion.ayahs).toHaveLength(8)
    expect(portion.isLastPortion).toBe(true)
  })
})
