import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { useUserPagesQuery } from '../hooks/useUserPages'
import { useSession } from '../hooks/useSession'
import { useSettings } from '../hooks/useSettings'
import { MushafImage } from '../components/MushafImage'
import { PageTransition } from '../components/PageTransition'
import {
  getReadingFocus,
  advanceReadingCursor,
  type ReadingFocus,
  type UserPageWithJuz,
} from '../lib/reading-cycle'

// Daily reading session. Sequential walk through the user's hifz in 30-page
// (~1.5 juz) batches, juz 30 first then 29, etc. No rating, no rep counter —
// just the mushaf page and a Mark-read/Next button. Each completed page logs
// 1 revision rep so the Dashboard counter reflects the work.
export function ReadingSession() {
  const navigate = useNavigate()
  const { data: pages = [] } = useUserPagesQuery()
  const { settings, updateSettings } = useSettings()
  const { startSession, logRevisionReps, completeSession } = useSession()

  // Snapshot the focus on first render where pages are loaded; subsequent
  // cursor updates (driven by this session) must not reshuffle the in-progress UI.
  const focusRef = useRef<ReadingFocus | null>(null)
  if (focusRef.current === null && pages.length > 0 && settings) {
    focusRef.current = getReadingFocus(
      pages as UserPageWithJuz[],
      settings.reading_cursor,
      settings.reading_loops
    )
  }
  const focus = focusRef.current
  const allPages = focus?.sessionPages ?? []

  const [doneSinceMount, setDoneSinceMount] = useState(0)
  const batchPosition = (focus?.cursorWithinBatch ?? 0) + doneSinceMount
  const currentPage = allPages[batchPosition] ?? null

  const startedRef = useRef(false)
  useEffect(() => {
    if (startedRef.current) return
    if (allPages.length === 0) return
    startedRef.current = true
    startSession('revision')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allPages.length])

  const persistProgress = (pagesDoneInBatch: number) => {
    if (!focus) return
    const next = advanceReadingCursor(
      focus.batchStart,
      pagesDoneInBatch,
      focus.cycleLength,
      focus.loops
    )
    updateSettings({ reading_cursor: next.cursor, reading_loops: next.loops })
  }

  const today = format(new Date(), 'yyyy-MM-dd')

  const markJuzCompleteForToday = () => {
    updateSettings({ reading_last_completed_date: today })
  }

  const handleNext = async () => {
    if (!currentPage) return
    await startSession('revision')
    await logRevisionReps(currentPage.page_number, 1)
    const nextPos = batchPosition + 1
    persistProgress(nextPos)
    if (nextPos >= allPages.length) {
      markJuzCompleteForToday()
      await completeSession(allPages.length)
      navigate('/')
      return
    }
    setDoneSinceMount((d) => d + 1)
  }

  const handleSkip = async () => {
    const nextPos = batchPosition + 1
    persistProgress(nextPos)
    if (nextPos >= allPages.length) {
      markJuzCompleteForToday()
      await completeSession(allPages.length)
      navigate('/')
      return
    }
    setDoneSinceMount((d) => d + 1)
  }

  // Locked: the user already finished their juz today.
  if (settings?.reading_last_completed_date === today) {
    return (
      <div className="min-h-screen bg-[#0b0e14] text-white flex flex-col items-center justify-center gap-3 px-6 text-center">
        <div className="text-5xl mb-1">🌙</div>
        <div className="text-xl font-bold">Today’s reading is complete</div>
        <p className="text-sm text-slate-400 max-w-sm leading-relaxed">
          Well done — you finished a whole juz today. May Allah accept it.
          The next juz unlocks tomorrow.
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

  if (!focus || allPages.length === 0) {
    return (
      <div className="min-h-screen bg-[#0b0e14] text-white flex flex-col items-center justify-center gap-3 px-6 text-center">
        <div className="text-lg font-bold">No pages in your hifz yet</div>
        <p className="text-sm text-slate-400 max-w-sm leading-relaxed">
          Add memorised pages via the surah picker on the dashboard, then they’ll
          show up in the reading cycle.
        </p>
        <button
          onClick={() => navigate('/')}
          className="mt-3 bg-[#151a23] border border-slate-700 text-slate-300 rounded-xl px-4 py-2 text-sm font-semibold"
        >
          ← Back
        </button>
      </div>
    )
  }

  const firstJuz = allPages[0].pages.juz
  const lastJuz = allPages[allPages.length - 1].pages.juz
  const juzLabel =
    firstJuz === lastJuz ? `Juz ${firstJuz}` : `Juz ${firstJuz} → Juz ${lastJuz}`

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
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold truncate">{juzLabel}</h1>
            <div className="text-[10px] uppercase tracking-widest text-emerald-300/90">
              Reading · {focus.batchStart + 1}–
              {focus.batchStart + allPages.length} of {focus.cycleLength} ·
              Loops {focus.loops}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs text-slate-500">
            Page {batchPosition + 1} of {allPages.length}
          </span>
          <div className="flex-1 bg-[#151a23] rounded-full h-1.5">
            <div
              className="bg-emerald-500 h-1.5 rounded-full transition-all"
              style={{
                width: `${((batchPosition + 1) / allPages.length) * 100}%`,
              }}
            />
          </div>
          <span className="text-xs text-slate-500">
            {allPages.length - batchPosition - 1} left
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
                defaultHidden={false}
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
                  <div className="text-xs font-bold uppercase text-emerald-400">
                    Reading
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSkip}
                  className="bg-[#151a23] border border-slate-700 text-slate-400 rounded-xl px-4 py-3 font-semibold text-sm"
                >
                  Skip
                </button>
                <button
                  onClick={handleNext}
                  className="btn-gradient flex-1 text-white rounded-xl py-3 font-bold text-sm"
                >
                  {batchPosition + 1 >= allPages.length
                    ? 'Finish ✓'
                    : 'Mark read · Next →'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  )
}
