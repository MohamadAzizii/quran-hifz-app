import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { addDays, format } from 'date-fns'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { calculateNextReview } from '../lib/sm2'
import { enqueueMutation } from '../lib/offline-queue'
import { getAyahsForPage } from '../lib/ayah-cache-idb'
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

export function useReplaceLearningWithSurah() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (args: {
      surahNumber: number
      startPage: number
      endPage: number
    }) => {
      if (!user) throw new Error('not signed in')
      const today = format(new Date(), 'yyyy-MM-dd')
      const lo = Math.max(1, Math.min(args.startPage, args.endPage))
      const hi = Math.min(604, Math.max(args.startPage, args.endPage))

      const { data: existing, error: selErr } = await supabase
        .from('user_pages')
        .select('page_number, status')
        .eq('user_id', user.id)
      if (selErr) throw selErr

      const blocked = new Set(
        (existing ?? [])
          .filter((p) => p.status !== 'learning')
          .map((p) => p.page_number as number)
      )

      const pagesToAdd: number[] = []
      for (let n = lo; n <= hi; n++) {
        if (!blocked.has(n)) pagesToAdd.push(n)
      }

      // The surah's first page often opens with the tail of the previous
      // surah. Find the ayah just before this surah begins so memorisation
      // starts at e.g. 43:1 instead of the leftover 42:52 at the page top.
      let firstPageProgressKey: string | null = null
      try {
        const startAyahs = await getAyahsForPage(lo)
        const sorted = [...startAyahs].sort(
          (a, b) => a.ayah_ordinal - b.ayah_ordinal
        )
        const surahFirstIdx = sorted.findIndex((a) =>
          a.ayah_key.startsWith(`${args.surahNumber}:`)
        )
        if (surahFirstIdx > 0) {
          firstPageProgressKey = sorted[surahFirstIdx - 1].ayah_key
        }
      } catch {
        firstPageProgressKey = null
      }

      const { error: delErr } = await supabase
        .from('user_pages')
        .delete()
        .eq('user_id', user.id)
        .eq('status', 'learning')
      if (delErr) throw delErr

      if (pagesToAdd.length === 0) return 0

      const rows = pagesToAdd.map((n) => ({
        user_id: user.id,
        page_number: n,
        status: 'learning' as PageStatus,
        strength: 2.5,
        interval_days: 1,
        repetitions: 0,
        next_review_date: today,
        progress_ayah_key: n === lo ? firstPageProgressKey : null,
      }))
      const { error: insErr } = await supabase.from('user_pages').insert(rows)
      if (insErr) throw insErr
      return rows.length
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user_pages', user?.id] }),
  })
}

export function useBulkMarkMemorised() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (args: { from: number; to: number }) => {
      if (!user) throw new Error('not signed in')
      const today = new Date()
      const lo = Math.max(1, Math.min(args.from, args.to))
      const hi = Math.min(604, Math.max(args.from, args.to))
      const SPREAD_DAYS = 14
      const rows = []
      for (let page_number = lo; page_number <= hi; page_number++) {
        const offset = (page_number - lo) % SPREAD_DAYS
        const reviewDate = new Date(today)
        reviewDate.setDate(reviewDate.getDate() + offset)
        rows.push({
          user_id: user.id,
          page_number,
          status: 'memorised' as PageStatus,
          strength: 3.0,
          interval_days: SPREAD_DAYS,
          repetitions: 1,
          next_review_date: format(reviewDate, 'yyyy-MM-dd'),
          last_reviewed_at: today.toISOString(),
          progress_ayah_key: null,
          graduated_to_recent_at: today.toISOString(),
        })
      }
      const { error } = await supabase
        .from('user_pages')
        .upsert(rows, { onConflict: 'user_id,page_number' })
      if (error) throw error
      return rows.length
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user_pages', user?.id] }),
  })
}

// Idempotent manual rating used on the My Quran page. Unlike useApplyRating
// (which compounds the SM-2 interval each review), this SETS a fixed strength
// and review interval per rating, so tapping the same option repeatedly is a
// no-op rather than pushing the next review date further and further out.
const MANUAL_RATING: Record<
  Rating,
  { strength: number; interval_days: number; repetitions: number }
> = {
  weak: { strength: 1.5, interval_days: 1, repetitions: 0 },
  okay: { strength: 2.6, interval_days: 4, repetitions: 1 },
  strong: { strength: 4.2, interval_days: 14, repetitions: 2 },
}

export function useSetPageRating() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (args: { page_number: number; rating: Rating }) => {
      if (!user) throw new Error('not signed in')
      const today = new Date()
      const m = MANUAL_RATING[args.rating]
      const updates = {
        strength: m.strength,
        interval_days: m.interval_days,
        repetitions: m.repetitions,
        next_review_date: format(addDays(today, m.interval_days), 'yyyy-MM-dd'),
        last_reviewed_at: today.toISOString(),
      }
      const { error } = await supabase
        .from('user_pages')
        .update(updates)
        .eq('user_id', user.id)
        .eq('page_number', args.page_number)
      if (error) throw error
    },
    onMutate: async (args) => {
      await qc.cancelQueries({ queryKey: ['user_pages', user?.id] })
      const prev = qc.getQueryData<UserPageWithMeta[]>(['user_pages', user?.id])
      const m = MANUAL_RATING[args.rating]
      qc.setQueryData<UserPageWithMeta[]>(['user_pages', user?.id], (old) =>
        old?.map((p) =>
          p.page_number === args.page_number
            ? {
                ...p,
                strength: m.strength,
                interval_days: m.interval_days,
                repetitions: m.repetitions,
                next_review_date: format(
                  addDays(new Date(), m.interval_days),
                  'yyyy-MM-dd'
                ),
              }
            : p
        )
      )
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
    onMutate: async (args) => {
      await qc.cancelQueries({ queryKey: ['user_pages', user?.id] })
      const prev = qc.getQueryData<UserPageWithMeta[]>(['user_pages', user?.id])
      const today = format(new Date(), 'yyyy-MM-dd')
      qc.setQueryData<UserPageWithMeta[]>(['user_pages', user?.id], (old) =>
        old?.map((p) =>
          p.page_number === args.page_number
            ? {
                ...p,
                status: args.to,
                ...(args.to === 'recent'
                  ? {
                      graduated_to_recent_at: new Date().toISOString(),
                      next_review_date: today,
                      progress_ayah_key: null,
                    }
                  : {}),
              }
            : p
        )
      )
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(['user_pages', user?.id], ctx.prev)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['user_pages', user?.id] }),
  })
}
