import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import {
  useApplyRating,
  useUserPagesQuery,
  type UserPageWithMeta,
} from '../hooks/useUserPages'
import { useTodaysTasks } from '../hooks/useTodaysTasks'
import { useSession } from '../hooks/useSession'
import { MushafImage } from '../components/MushafImage'
import { PageTransition } from '../components/PageTransition'
import { RatingButtons } from '../components/RatingButtons'
import { RepCounter } from '../components/RepCounter'
import { useDeviceSettings } from '../hooks/useDeviceSettings'
import type { Rating } from '../types'

// Algorithm revision: today's 4 picks are snapshotted to device settings the
// first time the screen opens today. Without the snapshot, useApplyRating
// mutates the rated page → React Query invalidates → computeTodaysTasks
// re-picks, so the array shifts under the user's feet within a session and is
// entirely different across re-entries. With it, the same 4 pages stay
// visible until they're all rated; only the day rollover (or a manual restart)
// gets a fresh pick.
export function RevisionSession() {
  const navigate = useNavigate()
  const applyRating = useApplyRating()
  const { data: pages = [] } = useUserPagesQuery()
  const { tasks } = useTodaysTasks()
  const { startSession, logRating, completeSession } = useSession()
  const { settings: device, update: updateDevice } = useDeviceSettings()

  const suggestedRepsByRating: Record<Rating, number> = {
    weak: device.repsWeak,
    okay: device.repsOkay,
    strong: device.repsStrong,
  }

  const today = format(new Date(), 'yyyy-MM-dd')

  // Snapshot the day's 4 pages on first render where pages are loaded. An
  // existing snapshot is kept and carries forward indefinitely until it's
  // fully rated — only after the last page is completed does a new batch get
  // picked the following day. This way an unfinished day's batch is the same
  // batch you see tomorrow (no extras added).
  const snapshotRef = useRef<number[] | null>(null)
  if (snapshotRef.current === null && pages.length > 0) {
    const snapshotExists = device.algoBatchPages.length > 0
    const snapshotComplete =
      snapshotExists &&
      device.algoBatchDone.length >= device.algoBatchPages.length
    const snapshotToday = device.algoBatchDate === today

    if (snapshotExists && !snapshotComplete) {
      // Carry forward — re-stamp the date so today's completion is tracked here.
      snapshotRef.current = device.algoBatchPages
      if (!snapshotToday) updateDevice({ algoBatchDate: today })
    } else if (snapshotExists && snapshotComplete && snapshotToday) {
      // All done for today — keep the snapshot so the all-done state renders.
      snapshotRef.current = device.algoBatchPages
    } else {
      // Either no snapshot at all, or last snapshot completed on a previous
      // day — pick a fresh batch from today's algorithm picks.
      const fresh = [
        ...tasks.recentPages.map((p) => p.page_number),
        ...tasks.spacedPages.map((p) => p.page_number),
      ]
      snapshotRef.current = fresh
      if (fresh.length > 0) {
        updateDevice({
          algoBatchDate: today,
          algoBatchPages: fresh,
          algoBatchDone: [],
        })
      }
    }
  }

  const snapshotPageNumbers = snapshotRef.current ?? []
  const ratedNumbers = device.algoBatchDone
  const pageMap = new Map(
    pages.map((p) => [p.page_number, p as UserPageWithMeta])
  )
  const batchPages = snapshotPageNumbers
    .map((num) => pageMap.get(num))
    .filter((p): p is UserPageWithMeta => !!p)
  const unratedPages = batchPages.filter(
    (p) => !ratedNumbers.includes(p.page_number)
  )

  // Local skip cursor — moves within the unrated set without mutating done.
  // Wraps modulo unratedPages.length so endless skips cycle through what's
  // still pending.
  const [skipPosition, setSkipPosition] = useState(0)
  const safePosition =
    unratedPages.length > 0 ? skipPosition % unratedPages.length : 0
  const currentPage = unratedPages[safePosition] ?? null

  const [rating, setRating] = useState<Rating | null>(null)
  const [reps, setReps] = useState(0)
  const suggestedReps = rating ? suggestedRepsByRating[rating] : 0

  const startedRef = useRef(false)
  useEffect(() => {
    if (startedRef.current) return
    if (snapshotPageNumbers.length === 0) return
    startedRef.current = true
    startSession('revision')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshotPageNumbers.length])

  const handleNext = async () => {
    if (!currentPage || !rating) return
    await startSession('revision')
    await logRating(currentPage.page_number, rating, { reps_revision: reps })
    await applyRating.mutateAsync({ page: currentPage, rating })

    const newRated = [...ratedNumbers, currentPage.page_number]
    updateDevice({ algoBatchDone: newRated })
    setRating(null)
    setReps(0)

    if (newRated.length >= batchPages.length) {
      await completeSession(batchPages.length)
      navigate('/')
    }
  }

  const handleSkip = () => {
    setSkipPosition((p) => p + 1)
    setRating(null)
    setReps(0)
  }

  // Empty/all-done states ------------------------------------------------

  if (snapshotPageNumbers.length === 0) {
    return (
      <div className="min-h-screen bg-[#0b0e14] text-white flex flex-col items-center justify-center gap-4 px-4">
        <div className="text-4xl">🎉</div>
        <div className="text-lg font-bold">No revision due today!</div>
        <button onClick={() => navigate('/')} className="text-indigo-300 text-sm">
          ← Back to dashboard
        </button>
      </div>
    )
  }

  if (!currentPage) {
    // All snapshotted pages have been rated — done for today.
    return (
      <div className="min-h-screen bg-[#0b0e14] text-white flex flex-col items-center justify-center gap-3 px-6 text-center">
        <div className="text-4xl">✓</div>
        <div className="text-lg font-bold">All done for today</div>
        <p className="text-sm text-slate-400 max-w-sm leading-relaxed">
          You finished today’s {batchPages.length}-page algorithm revision.
          A fresh batch will be picked tomorrow.
        </p>
        <button
          onClick={() => navigate('/')}
          className="mt-3 bg-[#151a23] border border-slate-700 text-slate-300 rounded-xl px-4 py-2 text-sm font-semibold"
        >
          ← Back to dashboard
        </button>
      </div>
    )
  }

  const completedCount = batchPages.length - unratedPages.length
  const positionLabel = completedCount + 1 // 1-indexed display

  return (
    <PageTransition>
      <div className="min-h-screen bg-[#0b0e14] text-white px-4 md:px-8 pt-5 md:pt-10 pb-24 md:pb-10 max-w-lg md:max-w-3xl lg:max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate('/')}
            className="bg-[#151a23] text-slate-400 rounded-lg px-3 py-2 text-sm"
            aria-label="Back to dashboard"
          >
            ← Back
          </button>
          <h1 className="text-lg font-bold flex-1">Revision Session</h1>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs text-slate-500">
            Page {positionLabel} of {batchPages.length}
          </span>
          <div className="flex-1 bg-[#151a23] rounded-full h-1.5">
            <div
              className="bg-purple-500 h-1.5 rounded-full transition-all"
              style={{
                width: `${(positionLabel / batchPages.length) * 100}%`,
              }}
            />
          </div>
          <span className="text-xs text-slate-500">
            {unratedPages.length - 1} left
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-6 lg:items-start">
          <div className="lg:order-1">
            <MushafImage
              pageNumber={currentPage.page_number}
              surahName={currentPage.pages.surah_name}
              juz={currentPage.pages.juz}
              hizb={currentPage.pages.hizb}
              defaultHidden={device.hideRevise}
            />
          </div>

          <div className="lg:order-2 lg:sticky lg:top-10 lg:self-start">
            <div className="bg-[#151a23] rounded-xl p-3 flex justify-between items-center mb-3">
              <div>
                <div className="text-base font-bold">
                  Page {currentPage.page_number}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {currentPage.pages.surah_name} · Juz {currentPage.pages.juz}
                </div>
              </div>
              <div className="text-right">
                <div
                  className={`text-xs font-bold uppercase ${
                    currentPage.status === 'recent'
                      ? 'text-amber-400'
                      : 'text-purple-400'
                  }`}
                >
                  {currentPage.status === 'recent' ? '🔁 Recent' : '🧠 Spaced'}
                </div>
                {currentPage.last_reviewed_at && (
                  <div className="text-xs text-slate-600 mt-0.5">
                    Last{' '}
                    {new Date(currentPage.last_reviewed_at).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>

            <div className="mb-3">
              <div className="text-xs uppercase tracking-widest text-slate-500 mb-2">
                How well did you know this page?
              </div>
              <RatingButtons
                selected={rating}
                onSelect={(r) => {
                  setRating(r)
                  setReps(0)
                }}
              />
            </div>

            {rating && (
              <div className="bg-[#151a23] rounded-2xl p-4 mb-4">
                <div className="flex justify-between items-center mb-3">
                  <div className="text-xs uppercase tracking-widest text-slate-500">
                    Suggested Repetitions
                  </div>
                  <div className="text-xs text-amber-400 font-semibold">
                    {suggestedReps} reps · {rating}
                  </div>
                </div>
                <RepCounter
                  label="Repetitions"
                  count={reps}
                  target={suggestedReps}
                  color="purple"
                  onAdd={() => setReps((r) => r + 1)}
                />
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleSkip}
                className="bg-[#151a23] border border-slate-700 text-slate-400 rounded-xl px-4 py-3 font-semibold text-sm"
              >
                Skip
              </button>
              <button
                onClick={handleNext}
                disabled={!rating}
                className="btn-gradient flex-1 text-white rounded-xl py-3 font-bold text-sm disabled:opacity-40"
              >
                {unratedPages.length <= 1 ? 'Finish ✓' : 'Next page →'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  )
}
