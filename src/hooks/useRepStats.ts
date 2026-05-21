import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export type RepWindow = 'today' | 'week' | 'month' | 'all'

export interface RepTotals {
  total: number
  withMushaf: number
  fromMemory: number
  revision: number
}

function windowStartISO(window: RepWindow): string | null {
  const now = new Date()
  switch (window) {
    case 'today': {
      const d = new Date(now)
      d.setHours(0, 0, 0, 0)
      return d.toISOString()
    }
    case 'week': {
      // Calendar week starting Monday in local time
      const d = new Date(now)
      d.setHours(0, 0, 0, 0)
      const dow = d.getDay() // 0=Sun,1=Mon,...
      const daysSinceMonday = (dow + 6) % 7
      d.setDate(d.getDate() - daysSinceMonday)
      return d.toISOString()
    }
    case 'month': {
      const d = new Date(now.getFullYear(), now.getMonth(), 1)
      return d.toISOString()
    }
    case 'all':
      return null
  }
}

interface JoinedRow {
  reps_with_mushaf: number | null
  reps_from_memory: number | null
  reps_revision: number | null
  sessions: { started_at: string; user_id: string } | null
}

export function useRepStats(window: RepWindow) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['rep-stats', user?.id, window],
    enabled: !!user,
    staleTime: 30_000,
    queryFn: async (): Promise<RepTotals> => {
      const since = windowStartISO(window)
      let q = supabase
        .from('session_ratings')
        .select(
          'reps_with_mushaf, reps_from_memory, reps_revision, sessions!inner(started_at, user_id)'
        )
        .eq('sessions.user_id', user!.id)
      if (since) q = q.gte('sessions.started_at', since)

      const { data, error } = await q
      if (error) throw error

      const rows = (data ?? []) as unknown as JoinedRow[]
      const totals: RepTotals = {
        total: 0,
        withMushaf: 0,
        fromMemory: 0,
        revision: 0,
      }
      for (const r of rows) {
        const m = r.reps_with_mushaf ?? 0
        const f = r.reps_from_memory ?? 0
        const v = r.reps_revision ?? 0
        totals.withMushaf += m
        totals.fromMemory += f
        totals.revision += v
        totals.total += m + f + v
      }
      return totals
    },
  })
}
