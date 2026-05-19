import { describe, it, expect } from 'vitest'
import { pagesToGraduate } from './auto-graduate'
import type { UserPage } from '../types'

const today = '2026-05-19'

function makePage(o: Partial<UserPage>): UserPage {
  return {
    id: '1',
    user_id: 'u1',
    page_number: 1,
    status: 'recent',
    strength: 2.5,
    interval_days: 1,
    repetitions: 0,
    next_review_date: today,
    last_reviewed_at: null,
    progress_ayah_key: null,
    graduated_to_recent_at: null,
    ...o,
  }
}

describe('pagesToGraduate', () => {
  it('returns empty list when no recent pages exist', () => {
    expect(pagesToGraduate([makePage({ status: 'memorised' })], today, 3)).toEqual([])
  })

  it('graduates a recent page once cycle days have passed', () => {
    const p = makePage({ graduated_to_recent_at: '2026-05-15T00:00:00Z' })
    expect(pagesToGraduate([p], today, 3).map((x) => x.page_number)).toEqual([1])
  })

  it('does NOT graduate if cycle days have not passed', () => {
    const p = makePage({ graduated_to_recent_at: '2026-05-18T00:00:00Z' })
    expect(pagesToGraduate([p], today, 3)).toEqual([])
  })

  it('does NOT graduate if strength dropped below 2.5', () => {
    const p = makePage({ graduated_to_recent_at: '2026-05-10T00:00:00Z', strength: 2.0 })
    expect(pagesToGraduate([p], today, 3)).toEqual([])
  })

  it('does NOT graduate if graduated_to_recent_at is null', () => {
    const p = makePage({ graduated_to_recent_at: null })
    expect(pagesToGraduate([p], today, 3)).toEqual([])
  })
})
