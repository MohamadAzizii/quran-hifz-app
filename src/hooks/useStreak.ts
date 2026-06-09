import { useQuery } from '@tanstack/react-query'
import { format, subDays } from 'date-fns'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export interface StreakDay {
  date: string // yyyy-MM-dd
  active: boolean
}

export interface StreakInfo {
  current: number
  todayActive: boolean
  last7: StreakDay[]
}

// "Active" = any session row started on that calendar day. The streak counts
// consecutive active days back from today. If today isn't active yet, the
// count starts from yesterday so the streak isn't lost just because the user
// hasn't logged anything today (yet).
export function useStreak() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['streak', user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async (): Promise<StreakInfo> => {
      const since = subDays(new Date(), 60)
      const { data, error } = await supabase
        .from('sessions')
        .select('started_at')
        .eq('user_id', user!.id)
        .gte('started_at', since.toISOString())
      if (error) throw error

      const activeDates = new Set<string>()
      for (const s of data ?? []) {
        activeDates.add(format(new Date(s.started_at), 'yyyy-MM-dd'))
      }

      const today = new Date()
      const todayStr = format(today, 'yyyy-MM-dd')
      const todayActive = activeDates.has(todayStr)

      let cursor = todayActive ? today : subDays(today, 1)
      let current = 0
      while (activeDates.has(format(cursor, 'yyyy-MM-dd'))) {
        current++
        cursor = subDays(cursor, 1)
      }

      const last7: StreakDay[] = []
      for (let i = 6; i >= 0; i--) {
        const d = subDays(today, i)
        const date = format(d, 'yyyy-MM-dd')
        last7.push({ date, active: activeDates.has(date) })
      }

      return { current, todayActive, last7 }
    },
  })
}
