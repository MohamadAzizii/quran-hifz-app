import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import type { UserSettings } from '../types'

const DEFAULTS: Omit<UserSettings, 'user_id'> = {
  daily_target: 'half',
  memorisation_reps_mushaf: 12,
  memorisation_reps_memory: 8,
  recent_cycle_days: 3,
  notifications_enabled: true,
  daily_reminder_time: '08:00',
}

export function useSettings() {
  const { user } = useAuth()
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['user_settings', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<UserSettings> => {
      const { data } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle()
      if (data) return data as UserSettings
      const { data: created, error } = await supabase
        .from('user_settings')
        .insert({ user_id: user!.id, ...DEFAULTS })
        .select()
        .single()
      if (error) throw error
      return created as UserSettings
    },
  })

  const mutation = useMutation({
    mutationFn: async (updates: Partial<Omit<UserSettings, 'user_id'>>) => {
      if (!user) throw new Error('not signed in')
      const { error } = await supabase
        .from('user_settings')
        .update(updates)
        .eq('user_id', user.id)
      if (error) throw error
    },
    onMutate: async (updates) => {
      await qc.cancelQueries({ queryKey: ['user_settings', user?.id] })
      const prev = qc.getQueryData<UserSettings>(['user_settings', user?.id])
      if (prev)
        qc.setQueryData<UserSettings>(['user_settings', user?.id], { ...prev, ...updates })
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(['user_settings', user?.id], ctx.prev)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['user_settings', user?.id] }),
  })

  return { settings: query.data, updateSettings: mutation.mutate }
}
