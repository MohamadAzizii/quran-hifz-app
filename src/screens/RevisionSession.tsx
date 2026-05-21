import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApplyRating } from '../hooks/useUserPages'
import { useTodaysTasks } from '../hooks/useTodaysTasks'
import { useSession } from '../hooks/useSession'
import { MushafImage } from '../components/MushafImage'
import { RatingButtons } from '../components/RatingButtons'
import { RepCounter } from '../components/RepCounter'
import type { Rating } from '../types'
import type { UserPageWithMeta } from '../hooks/useUserPages'

const SUGGESTED_REPS: Record<Rating, number> = { weak: 15, okay: 10, strong: 5 }

export function RevisionSession() {
  const navigate = useNavigate()
  const applyRating = useApplyRating()
  const { tasks } = useTodaysTasks()
  const { startSession, logRating, completeSession } = useSession()

  const allPages: UserPageWithMeta[] = [
    ...(tasks.recentPages as UserPageWithMeta[]),
    ...(tasks.spacedPages as UserPageWithMeta[]),
  ]

  const [currentIndex, setCurrentIndex] = useState(0)
  const [rating, setRating] = useState<Rating | null>(null)
  const [reps, setReps] = useState(0)

  const currentPage = allPages[currentIndex] ?? null
  const suggestedReps = rating ? SUGGESTED_REPS[rating] : 0

  const startedRef = useRef(false)
  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    startSession('revision')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleNext = async () => {
    if (!currentPage || !rating) return
    await logRating(currentPage.page_number, rating, { reps_revision: reps })
    await applyRating.mutateAsync({ page: currentPage, rating })

    if (currentIndex + 1 >= allPages.length) {
      await completeSession(allPages.length)
      navigate('/')
      return
    }
    setCurrentIndex((i) => i + 1)
    setRating(null)
    setReps(0)
  }

  const handleSkip = () => {
    if (currentIndex + 1 >= allPages.length) {
      navigate('/')
      return
    }
    setCurrentIndex((i) => i + 1)
    setRating(null)
    setReps(0)
  }

  if (allPages.length === 0) {
    return (
      <div className="min-h-screen bg-[#0f1117] text-white flex flex-col items-center justify-center gap-4 px-4">
        <div className="text-4xl">🎉</div>
        <div className="text-lg font-bold">No revision due today!</div>
        <button onClick={() => navigate('/')} className="text-blue-400 text-sm">
          ← Back to dashboard
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f1117] text-white px-4 pt-5 pb-24 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => navigate('/')}
          className="bg-[#1e293b] text-slate-400 rounded-lg px-3 py-2 text-sm"
          aria-label="Back to dashboard"
        >
          ← Back
        </button>
        <h1 className="text-lg font-bold flex-1">Revision Session</h1>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs text-slate-500">
          Page {currentIndex + 1} of {allPages.length}
        </span>
        <div className="flex-1 bg-[#1e293b] rounded-full h-1.5">
          <div
            className="bg-purple-500 h-1.5 rounded-full transition-all"
            style={{ width: `${((currentIndex + 1) / allPages.length) * 100}%` }}
          />
        </div>
        <span className="text-xs text-slate-500">
          {allPages.length - currentIndex - 1} left
        </span>
      </div>

      {currentPage && (
        <>
          <div className="bg-[#1e293b] rounded-xl p-3 flex justify-between items-center mb-3">
            <div>
              <div className="text-base font-bold">Page {currentPage.page_number}</div>
              <div className="text-xs text-slate-500 mt-0.5">
                {currentPage.pages.surah_name} · Juz {currentPage.pages.juz}
              </div>
            </div>
            <div className="text-right">
              <div
                className={`text-xs font-bold uppercase ${
                  currentPage.status === 'recent' ? 'text-amber-400' : 'text-purple-400'
                }`}
              >
                {currentPage.status === 'recent' ? '🔁 Recent' : '🧠 Spaced'}
              </div>
              {currentPage.last_reviewed_at && (
                <div className="text-xs text-slate-600 mt-0.5">
                  Last {new Date(currentPage.last_reviewed_at).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>

          <MushafImage
            pageNumber={currentPage.page_number}
            surahName={currentPage.pages.surah_name}
            juz={currentPage.pages.juz}
            hizb={currentPage.pages.hizb}
            defaultHidden={true}
          />

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
            <div className="bg-[#1e293b] rounded-2xl p-4 mb-4">
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
              className="bg-[#1e293b] border border-slate-700 text-slate-400 rounded-xl px-4 py-3 font-semibold text-sm"
            >
              Skip
            </button>
            <button
              onClick={handleNext}
              disabled={!rating}
              className="flex-1 bg-blue-600 text-white rounded-xl py-3 font-bold text-sm disabled:opacity-40"
            >
              {currentIndex + 1 >= allPages.length ? 'Finish ✓' : 'Next page →'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
