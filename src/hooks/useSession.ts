import { useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { queryClient } from '../lib/queryClient'
import type { SessionType, Rating } from '../types'

export function useSession() {
  const { user } = useAuth()
  const [sessionId, setSessionId] = useState<string | null>(null)
  const startInFlight = useRef<Promise<string | null> | null>(null)

  const startSession = async (type: SessionType): Promise<string | null> => {
    if (sessionId) return sessionId
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
      setSessionId(data.id)
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
    if (!sessionId) return
    await supabase.from('session_ratings').insert({
      session_id: sessionId,
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
    if (!sessionId) return
    await supabase.from('session_ratings').insert({
      session_id: sessionId,
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
    if (!sessionId) return
    await supabase.from('session_ratings').insert({
      session_id: sessionId,
      page_number,
      rating: null,
      reps_with_mushaf: 0,
      reps_from_memory: 0,
      reps_revision: reps,
    })
    queryClient.invalidateQueries({ queryKey: ['rep-stats'] })
  }

  const completeSession = async (total_pages: number) => {
    if (!sessionId) return
    await supabase
      .from('sessions')
      .update({ completed_at: new Date().toISOString(), total_pages })
      .eq('id', sessionId)
    setSessionId(null)
    queryClient.invalidateQueries({ queryKey: ['rep-stats'] })
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
