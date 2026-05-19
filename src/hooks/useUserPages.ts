import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { calculateNextReview } from '../lib/sm2'
import { enqueueMutation } from '../lib/offline-queue'
import type { UserPage, PageStatus, Rating, QuranPage } from '../types'

export type UserPageWithMeta = UserPage & {
  pages: Pick<QuranPage, 'juz' | 'hizb' | 'surah_name'>
}

export function useUserPagesQuery() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['user_pages', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<UserPageWithMeta[]> => {
      const { data, error } = await supabase
        .from('user_pages')
        .select('*, pages!inner(juz, hizb, surah_name)')
        .eq('user_id', user!.id)
      if (error) throw error
      return (data ?? []) as UserPageWithMeta[]
    },
  })
}

export function useAddPage() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (page_number: number) => {
      if (!user) throw new Error('not signed in')
      const today = format(new Date(), 'yyyy-MM-dd')
      const payload = {
        user_id: user.id,
        page_number,
        status: 'learning' as PageStatus,
        strength: 2.5,
        interval_days: 1,
        repetitions: 0,
        next_review_date: today,
        progress_ayah_key: null,
      }
      if (!navigator.onLine) {
        await enqueueMutation({ table: 'user_pages', operation: 'insert', payload })
        return null
      }
      const { data, error } = await supabase
        .from('user_pages')
        .insert(payload)
        .select('*, pages!inner(juz, hizb, surah_name)')
        .single()
      if (error) throw error
      return data as UserPageWithMeta
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user_pages', user?.id] }),
  })
}

export function useAdvanceProgress() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (args: {
      page_number: number
      progress_ayah_key: string | null
      graduate?: boolean
    }) => {
      if (!user) throw new Error('not signed in')
      const updates: Partial<UserPage> = {
        progress_ayah_key: args.progress_ayah_key,
        last_reviewed_at: new Date().toISOString(),
      }
      if (args.graduate) {
        updates.status = 'recent'
        updates.graduated_to_recent_at = new Date().toISOString()
        updates.next_review_date = format(new Date(), 'yyyy-MM-dd')
      }
      const op = {
        table: 'user_pages',
        operation: 'update' as const,
        payload: {
          ...updates,
          _filter: { user_id: user.id, page_number: args.page_number },
        },
      }
      if (!navigator.onLine) {
        await enqueueMutation(op)
        return
      }
      const { error } = await supabase
        .from('user_pages')
        .update(updates)
        .eq('user_id', user.id)
        .eq('page_number', args.page_number)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user_pages', user?.id] }),
  })
}

export function useApplyRating() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (args: { page: UserPageWithMeta; rating: Rating }) => {
      if (!user) throw new Error('not signed in')
      const today = format(new Date(), 'yyyy-MM-dd')
      const sm2 = calculateNextReview(args.page, args.rating, today)
      const updates = { ...sm2, last_reviewed_at: new Date().toISOString() }
      const op = {
        table: 'user_pages',
        operation: 'update' as const,
        payload: {
          ...updates,
          _filter: { user_id: user.id, page_number: args.page.page_number },
        },
      }
      if (!navigator.onLine) {
        await enqueueMutation(op)
        return
      }
      const { error } = await supabase
        .from('user_pages')
        .update(updates)
        .eq('user_id', user.id)
        .eq('page_number', args.page.page_number)
      if (error) throw error
    },
    onMutate: async (args) => {
      await qc.cancelQueries({ queryKey: ['user_pages', user?.id] })
      const prev = qc.getQueryData<UserPageWithMeta[]>(['user_pages', user?.id])
      qc.setQueryData<UserPageWithMeta[]>(['user_pages', user?.id], (old) => {
        if (!old) return old
        const sm2 = calculateNextReview(args.page, args.rating, format(new Date(), 'yyyy-MM-dd'))
        return old.map((p) =>
          p.page_number === args.page.page_number ? { ...p, ...sm2 } : p
        )
      })
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(['user_pages', user?.id], ctx.prev)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['user_pages', user?.id] }),
  })
}

export function useGraduatePage() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (args: { page_number: number; to: PageStatus }) => {
      if (!user) throw new Error('not signed in')
      const today = format(new Date(), 'yyyy-MM-dd')
      const updates: Partial<UserPage> = {
        status: args.to,
        last_reviewed_at: new Date().toISOString(),
        ...(args.to === 'recent'
          ? {
              graduated_to_recent_at: new Date().toISOString(),
              next_review_date: today,
              progress_ayah_key: null,
            }
          : {}),
      }
      const { error } = await supabase
        .from('user_pages')
        .update(updates)
        .eq('user_id', user.id)
        .eq('page_number', args.page_number)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user_pages', user?.id] }),
  })
}
