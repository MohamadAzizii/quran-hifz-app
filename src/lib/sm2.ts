import { addDays, format, parseISO } from 'date-fns'
import type { Rating, SM2Result } from '../types'

interface PageSM2State {
  strength: number
  interval_days: number
  repetitions: number
  next_review_date: string
}

// Rating → SM-2 quality score
const QUALITY: Record<Rating, number> = { weak: 1, okay: 3, strong: 5 }

export function calculateNextReview(
  page: PageSM2State,
  rating: Rating,
  today: string
): SM2Result {
  const q = QUALITY[rating]
  let { strength, interval_days, repetitions } = page

  if (q >= 3) {
    if (repetitions === 0) interval_days = 1
    else if (repetitions === 1) interval_days = 6
    else interval_days = Math.max(1, Math.round(interval_days * strength))
    repetitions += 1
  } else {
    repetitions = 0
    interval_days = 1
  }

  strength = Math.max(1.3, strength + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))

  const next_review_date = format(addDays(parseISO(today), interval_days), 'yyyy-MM-dd')

  return { strength, interval_days, repetitions, next_review_date }
}
