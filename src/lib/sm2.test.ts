import { describe, it, expect } from 'vitest'
import { calculateNextReview } from './sm2'

const today = '2026-05-19'
const basePage = {
  strength: 2.5,
  interval_days: 1,
  repetitions: 0,
  next_review_date: today,
}

describe('calculateNextReview', () => {
  it('resets interval to 1 and repetitions to 0 on weak rating', () => {
    const result = calculateNextReview(
      { ...basePage, repetitions: 3, interval_days: 10 },
      'weak',
      today
    )
    expect(result.repetitions).toBe(0)
    expect(result.interval_days).toBe(1)
  })

  it('sets interval to 1 on first okay review', () => {
    const result = calculateNextReview({ ...basePage, repetitions: 0 }, 'okay', today)
    expect(result.repetitions).toBe(1)
    expect(result.interval_days).toBe(1)
  })

  it('sets interval to 6 on second okay review', () => {
    const result = calculateNextReview(
      { ...basePage, repetitions: 1, interval_days: 1 },
      'okay',
      today
    )
    expect(result.repetitions).toBe(2)
    expect(result.interval_days).toBe(6)
  })

  it('multiplies interval by easiness on third+ okay review', () => {
    const result = calculateNextReview(
      { ...basePage, repetitions: 2, interval_days: 6 },
      'okay',
      today
    )
    expect(result.interval_days).toBe(Math.round(6 * 2.5))
    expect(result.repetitions).toBe(3)
  })

  it('strong rating increases strength relative to okay', () => {
    const strong = calculateNextReview(
      { ...basePage, repetitions: 2, interval_days: 6 },
      'strong',
      today
    )
    const okay = calculateNextReview(
      { ...basePage, repetitions: 2, interval_days: 6 },
      'okay',
      today
    )
    expect(strong.strength).toBeGreaterThan(okay.strength)
  })

  it('decreases strength on weak rating', () => {
    const result = calculateNextReview({ ...basePage, strength: 2.5 }, 'weak', today)
    expect(result.strength).toBeLessThan(2.5)
  })

  it('does not let strength drop below 1.3', () => {
    const result = calculateNextReview({ ...basePage, strength: 1.3 }, 'weak', today)
    expect(result.strength).toBeGreaterThanOrEqual(1.3)
  })

  it('sets next_review_date to today + interval', () => {
    const result = calculateNextReview(
      { ...basePage, repetitions: 1, interval_days: 1 },
      'okay',
      today
    )
    expect(result.next_review_date).toBe('2026-05-25')
  })
})

describe('calculateNextReview — regression', () => {
  it('never returns interval_days less than 1', () => {
    const result = calculateNextReview(
      { ...basePage, strength: 1.3, interval_days: 1, repetitions: 5 },
      'okay',
      today
    )
    expect(result.interval_days).toBeGreaterThanOrEqual(1)
  })

  it('weak rating reduces strength below starting value', () => {
    const result = calculateNextReview(basePage, 'weak', today)
    expect(result.strength).toBeLessThan(2.5)
  })

  it('next_review_date is computed timezone-safely across month boundaries', () => {
    const result = calculateNextReview(
      { ...basePage, repetitions: 1, interval_days: 1 },
      'okay',
      '2026-05-30'
    )
    expect(result.next_review_date).toBe('2026-06-05')
  })
})
