import { useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { queryClient } from '../lib/queryClient'
import type { SessionType, Rating } from '../types'

// Note: sessionId is mirrored in a ref so the async log helpers don't read a
// stale value from closure. If a user taps Next very quickly after the screen
// mounts — before the startSession insert resolves — the state-bound closure
// would still see sessionId=null and silently drop the log. The ref always
// reflects the latest value.
export function useSession() {
  const { user } = useAuth()
  const [sessionId, setSessionId] = useState<string | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const startInFlight = useRef<Promise<string | null> | null>(null)

  const setSession = (id: string | null) => {
    sessionIdRef.current = id
    setSessionId(id)
  }

  const startSession = async (type: SessionType): Promise<string | null> => {
    if (sessionIdRef.current) return sessionIdRef.current
    if (startInFlight.current) return startInFlight.current
    if (!user) return null

    startInFlight.current = (async () => {
      const { data, error } = await supabase
        .from('sessions')
        .insert({
          user_id: user.id,
          type,
          started_at: new Date().toISOString(),
          total_pages: 0,
        })
        .select()
        .single()
      if (error || !data) return null
      setSession(data.id)
      // Fresh session row exists — refresh the streak so today lights up.
      queryClient.invalidateQueries({ queryKey: ['streak'] })
      return data.id
    })()

    const id = await startInFlight.current
    startInFlight.current = null
    return id
  }

  const logRating = async (
    page_number: number,
    rating: Rating,
    reps: { reps_revision?: number }
  ) => {
    const sid = sessionIdRef.current
    if (!sid) return
    await supabase.from('session_ratings').insert({
      session_id: sid,
      page_number,
      rating,
      reps_with_mushaf: 0,
      reps_from_memory: 0,
      reps_revision: reps.reps_revision ?? 0,
    })
  }

  const logMemorisation = async (
    page_number: number,
    reps_with_mushaf: number,
    reps_from_memory: number
  ) => {
    const sid = sessionIdRef.current
    if (!sid) return
    await supabase.from('session_ratings').insert({
      session_id: sid,
      page_number,
      rating: null,
      reps_with_mushaf,
      reps_from_memory,
      reps_revision: 0,
    })
  }

  // Used by the recovery-plan cycle: log revision reps without a strength rating.
  // Invalidate rep-stats so the Dashboard counter updates immediately, even if
  // the user leaves the session before completeSession fires.
  const logRevisionReps = async (page_number: number, reps: number) => {
    const sid = sessionIdRef.current
    if (!sid) return
    await supabase.from('session_ratings').insert({
      session_id: sid,
      page_number,
      rating: null,
      reps_with_mushaf: 0,
      reps_from_memory: 0,
      reps_revision: reps,
    })
    queryClient.invalidateQueries({ queryKey: ['rep-stats'] })
  }

  const completeSession = async (total_pages: number) => {
    const sid = sessionIdRef.current
    if (!sid) return
    await supabase
      .from('sessions')
      .update({ completed_at: new Date().toISOString(), total_pages })
      .eq('id', sid)
    setSession(null)
    queryClient.invalidateQueries({ queryKey: ['rep-stats'] })
    queryClient.invalidateQueries({ queryKey: ['streak'] })
  }

  return {
    sessionId,
    startSession,
    logRating,
    logMemorisation,
    logRevisionReps,
    completeSession,
  }
}
