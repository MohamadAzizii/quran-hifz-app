import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApplyRating, useUserPagesQuery } from '../hooks/useUserPages'
import { useSession } from '../hooks/useSession'
import { useDeviceSettings } from '../hooks/useDeviceSettings'
import { MushafImage } from '../components/MushafImage'
import { PageTransition } from '../components/PageTransition'
import { RatingButtons } from '../components/RatingButtons'
import { RepCounter } from '../components/RepCounter'
import { getTodaysFocus, type UserPageWithJuz } from '../lib/recovery-plan'
import type { Rating } from '../types'

// Mirror of RevisionSession, but the page set comes from today's recovery-plan
// focus (juz of the day, or Yaseen + weak on Fridays) instead of useTodaysTasks.
// Ratings still flow through useApplyRating, so strength + next_review_date
// updates exactly as they did before.
export function RecoverySession() {
  const navigate = useNavigate()
  const applyRating = useApplyRating()
  const { data: pages = [] } = useUserPagesQuery()
  const { startSession, logRating, completeSession } = useSession()
  const { settings: device } = useDeviceSettings()

  const focus = useMemo(
    () => getTodaysFocus(pages as UserPageWithJuz[]),
    [pages]
  )

  const suggestedRepsByRating: Record<Rating, number> = {
    weak: device.repsWeak,
    okay: device.repsOkay,
    strong: device.repsStrong,
  }

  const [currentIndex, setCurrentIndex] = useState(0)
  const [rating, setRating] = useState<Rating | null>(null)
  const [reps, setReps] = useState(0)

  const allPages = focus.sessionPages
  const currentPage = allPages[currentIndex] ?? null
  const suggestedReps = rating ? suggestedRepsByRating[rating] : 0

  const startedRef = useRef(false)
  useEffect(() => {
    if (startedRef.current) return
    if (allPages.length === 0) return
    startedRef.current = true
    startSession('revision')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allPages.length])

  const handleNext = async () => {
    if (!currentPage || !rating) return
    await logRating(currentPage.page_number, rating, { reps_revision: reps })
    await applyRating.mutateAsync({ page: currentPage, rating })

    if (currentIndex + 1 >= allPages.length) {
      await completeSession(allPages.length)
      navigate('/revise')
      return
    }
    setCurrentIndex((i) => i + 1)
    setRating(null)
    setReps(0)
  }

  const handleSkip = () => {
    if (currentIndex + 1 >= allPages.length) {
      navigate('/revise')
      return
    }
    setCurrentIndex((i) => i + 1)
    setRating(null)
    setReps(0)
  }

  if (allPages.length === 0) {
    return (
      <div className="min-h-screen bg-[#0b0e14] text-white flex flex-col items-center justify-center gap-3 px-6 text-center">
        <div className="text-xs uppercase tracking-widest text-amber-400/80">
          {focus.dayName} · {focus.focusLabel}
        </div>
        <div className="text-lg font-bold">Nothing in your hifz for today's focus yet</div>
        <p className="text-sm text-slate-400 max-w-sm leading-relaxed">
          You don't have any memorised or recent pages in {focus.focusLabel} yet.
          Add them via the surah picker on the dashboard, then they'll show up here.
        </p>
        <button
          onClick={() => navigate('/revise')}
          className="mt-3 bg-[#151a23] border border-slate-700 text-slate-300 rounded-xl px-4 py-2 text-sm font-semibold"
        >
          ← Back to plan
        </button>
      </div>
    )
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-[#0b0e14] text-white px-4 md:px-8 pt-5 md:pt-10 pb-24 md:pb-10 max-w-lg md:max-w-3xl lg:max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate('/revise')}
            className="bg-[#151a23] text-slate-400 rounded-lg px-3 py-2 text-sm"
            aria-label="Back to plan"
          >
            ← Back
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold truncate">{focus.focusLabel}</h1>
            <div className="text-[10px] uppercase tracking-widest text-amber-400/80">
              {focus.dayName} · {allPages.length} of {focus.totalAvailable} pages
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs text-slate-500">
            Page {currentIndex + 1} of {allPages.length}
          </span>
          <div className="flex-1 bg-[#151a23] rounded-full h-1.5">
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
                  <div className="text-base font-bold">Page {currentPage.page_number}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {currentPage.pages.surah_name} · Juz {currentPage.pages.juz}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold uppercase text-purple-400">
                    Recovery
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5">
                    Strength {currentPage.strength.toFixed(1)}
                  </div>
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
                  {currentIndex + 1 >= allPages.length ? 'Finish ✓' : 'Next page →'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  )
}
