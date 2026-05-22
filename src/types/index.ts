// src/types/index.ts

export type PageStatus = 'learning' | 'recent' | 'memorised'
export type Rating = 'strong' | 'okay' | 'weak'
export type SessionType = 'memorisation' | 'revision'
export type DailyTarget = 'quarter' | 'half' | 'one' | 'two'

export interface QuranPage {
  page_number: number
  juz: number
  hizb: number
  surah_name: string
  first_ayah: string
  last_ayah: string
}

export interface UserPage {
  id: string
  user_id: string
  page_number: number
  status: PageStatus
  strength: number // SM-2 easiness factor, default 2.5
  interval_days: number
  repetitions: number
  next_review_date: string // ISO date YYYY-MM-DD
  last_reviewed_at: string | null
  progress_ayah_key: string | null
  graduated_to_recent_at: string | null
}

export interface Session {
  id: string
  user_id: string
  type: SessionType
  started_at: string
  completed_at: string | null
  total_pages: number
}

export interface SessionRating {
  id: string
  session_id: string
  page_number: number
  rating: Rating | null
  reps_with_mushaf: number
  reps_from_memory: number
  reps_revision: number
}

export interface AyahCache {
  page_number: number
  ayah_key: string
  ayah_ordinal: number
  text_uthmani: string
}

export interface UserSettings {
  user_id: string
  daily_target: DailyTarget
  memorisation_reps_mushaf: number
  memorisation_reps_memory: number
  recent_cycle_days: number
  notifications_enabled: boolean
  daily_reminder_time: string // HH:MM
}

export interface TodaysTasks {
  newPages: UserPage[]
  recentPages: UserPage[]
  spacedPages: UserPage[]
  totalDue: number
  revisionDueTotal: number // due recent + spaced before the daily cap is applied
}

export interface SM2Result {
  interval_days: number
  strength: number
  repetitions: number
  next_review_date: string
}
