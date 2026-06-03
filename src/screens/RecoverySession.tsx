import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserPagesQuery } from '../hooks/useUserPages'
import { useSession } from '../hooks/useSession'
import { useDeviceSettings } from '../hooks/useDeviceSettings'
import { MushafImage } from '../components/MushafImage'
import { PageTransition } from '../components/PageTransition'
import { RepCounter } from '../components/RepCounter'
import {
  getCycleFocus,
  advanceCursor,
  type CycleFocus,
  type UserPageWithJuz,
} from '../lib/recovery-plan'

const REP_TARGET = 10

// Recovery-plan session: sequential 10-page cycle from Juz 30 top downward.
// No strength rating — just count reps per page (target 10).
//
// Cursor advances per page (on Next/Skip), so leaving mid-session and coming
// back resumes at the next undone page. We snapshot the focus on first mount
// so the in-progress UI doesn't reshuffle while the cursor moves underneath it.
export function RecoverySession() {
  const navigate = useNavigate()
  const { data: pages = [] } = useUserPagesQuery()
  const { settings: device, update: updateDevice } = useDeviceSettings()
  const { startSession, logRevisionReps, completeSession } = useSession()

  // Snapshot the cycle focus on the first render where pages are loaded.
  // Subsequent updates to device.recoveryCursor (which we ourselves trigger
  // as the session progresses) must NOT change the session list.
  const focusRef = useRef<CycleFocus | null>(null)
  if (focusRef.current === null && pages.length > 0) {
    focusRef.current = getCycleFocus(
      pages as UserPageWithJuz[],
      device.recoveryCursor,
      device.recoveryLoops
    )
  }
  const focus = focusRef.current
  const allPages = focus?.sessionPages ?? []

  // Start at the batch position the cursor was at on first mount.
  const [currentIndex, setCurrentIndex] = useState(
    () => focusRef.current?.cursorWithinBatch ?? 0
  )
  const [reps, setReps] = useState(0)
  const currentPage = allPages[currentIndex] ?? null

  const startedRef = useRef(false)
  useEffect(() => {
    if (startedRef.current) return
    if (allPages.length === 0) return
    startedRef.current = true
    startSession('revision')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allPages.length])

  // Persist progress to device cursor: batchStart + however many pages of this
  // batch have been done. advanceCursor handles the wrap+loop-bump for us.
  const persistProgress = (pagesDoneInBatch: number) => {
    if (!focus) return
    const next = advanceCursor(
      focus.batchStart,
      pagesDoneInBatch,
      focus.cycleLength,
      focus.loops
    )
    updateDevice({ recoveryCursor: next.cursor, recoveryLoops: next.loops })
  }

  const handleNext = async () => {
    if (!currentPage) return
    // Idempotent: returns the existing session id, or the in-flight insert
    // promise, or kicks off a new one. Ensures the log below isn't dropped
    // because the on-mount startSession hadn't resolved yet.
    await startSession('revision')
    await logRevisionReps(currentPage.page_number, reps)
    const doneCount = currentIndex + 1
    persistProgress(doneCount)
    if (doneCount >= allPages.length) {
      await completeSession(allPages.length)
      navigate('/revise')
      return
    }
    setCurrentIndex(doneCount)
    setReps(0)
  }

  const handleSkip = async () => {
    const doneCount = currentIndex + 1
    persistProgress(doneCount)
    if (doneCount >= allPages.length) {
      await completeSession(allPages.length)
      navigate('/revise')
      return
    }
    setCurrentIndex(doneCount)
    setReps(0)
  }

  if (!focus || allPages.length === 0) {
    return (
      <div className="min-h-screen bg-[#0b0e14] text-white flex flex-col items-center justify-center gap-3 px-6 text-center">
        <div className="text-lg font-bold">No pages in your hifz yet</div>
        <p className="text-sm text-slate-400 max-w-sm leading-relaxed">
          Add memorised pages via the surah picker on the dashboard, then they’ll
          show up in the cycle.
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

  const firstJuz = allPages[0].pages.juz
  const lastJuz = allPages[allPages.length - 1].pages.juz
  const juzLabel =
    firstJuz === lastJuz ? `Juz ${firstJuz}` : `Juz ${firstJuz} → Juz ${lastJuz}`

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
            <h1 className="text-lg font-bold truncate">{juzLabel}</h1>
            <div className="text-[10px] uppercase tracking-widest text-purple-300/90">
              Cycle {focus.batchStart + 1}–{focus.batchStart + allPages.length}{' '}
              of {focus.cycleLength} · Loops completed {focus.loops}
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
              style={{
                width: `${((currentIndex + 1) / allPages.length) * 100}%`,
              }}
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
                  <div className="text-base font-bold">
                    Page {currentPage.page_number}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {currentPage.pages.surah_name} · Juz {currentPage.pages.juz}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold uppercase text-purple-400">
                    Recovery
                  </div>
                </div>
              </div>

              <div className="bg-[#151a23] rounded-2xl p-4 mb-4">
                <div className="flex justify-between items-center mb-3">
                  <div className="text-xs uppercase tracking-widest text-slate-500">
                    Repetitions
                  </div>
                  <div className="text-xs text-amber-400 font-semibold">
                    target {REP_TARGET}
                  </div>
                </div>
                <RepCounter
                  label="Repetitions"
                  count={reps}
                  target={REP_TARGET}
                  color="purple"
                  onAdd={() => setReps((r) => r + 1)}
                />
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
                  {currentIndex + 1 >= allPages.length
                    ? 'Finish ✓'
                    : 'Next page →'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  )
}
