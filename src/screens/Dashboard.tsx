import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { useUserPagesQuery } from '../hooks/useUserPages'
import { useTodaysTasks } from '../hooks/useTodaysTasks'
import { useSettings } from '../hooks/useSettings'
import { useAutoGraduate } from '../hooks/useAutoGraduate'
import { JuzStrengthMap } from '../components/JuzStrengthMap'
import { RepStatsCard } from '../components/RepStatsCard'
import { PageTransition } from '../components/PageTransition'
import { QuoteOfTheDay } from '../components/QuoteOfTheDay'
import { StreakBar } from '../components/StreakBar'
import {
  getReadingFocus,
  type UserPageWithJuz,
} from '../lib/reading-cycle'
import { approximateJuzMemorised } from '../lib/juz-progress'

export function Dashboard() {
  useAutoGraduate()
  const navigate = useNavigate()
  const { data: pages = [], isLoading: pagesLoading } = useUserPagesQuery()
  const { tasks } = useTodaysTasks()
  const { settings, updateSettings } = useSettings()

  const reading = useMemo(
    () =>
      getReadingFocus(
        pages as UserPageWithJuz[],
        settings?.reading_cursor ?? 0,
        settings?.reading_loops ?? 0
      ),
    [pages, settings?.reading_cursor, settings?.reading_loops]
  )
  const readingFirst = reading.sessionPages[0]
  const readingLast = reading.sessionPages[reading.sessionPages.length - 1]
  const readingRange =
    readingFirst && readingLast
      ? `Juz ${readingFirst.pages.juz} · ${readingFirst.pages.surah_name} → ${readingLast.pages.surah_name}`
      : ''
  const today = format(new Date(), 'yyyy-MM-dd')
  const algoSnapshotExists = (settings?.algo_batch_pages.length ?? 0) > 0
  const algoSnapshotComplete =
    algoSnapshotExists &&
    (settings?.algo_batch_done.length ?? 0) >=
      (settings?.algo_batch_pages.length ?? 0)
  // An incomplete snapshot is the live one regardless of date — it carries
  // forward until rated. A complete snapshot only matters if it was completed
  // today (lets us show "all done"); otherwise we fall back to today's pick.
  const algoSnapshotActive = algoSnapshotExists && !algoSnapshotComplete
  const algoCompletedToday =
    algoSnapshotExists &&
    algoSnapshotComplete &&
    settings?.algo_batch_date === today
  const algoSnapshotTotal = algoSnapshotActive
    ? settings?.algo_batch_pages.length ?? 0
    : tasks.recentPages.length + tasks.spacedPages.length
  const algoSnapshotDone = algoSnapshotActive
    ? settings?.algo_batch_done.length ?? 0
    : 0
  const algoRemaining = algoSnapshotTotal - algoSnapshotDone

  const memorisedCount = pages.filter(
    (p) => p.status === 'memorised' || p.status === 'recent'
  ).length
  // Aggregates memorised pages across the whole hifz and divides by ~20.
  // 10 pages of Yaseen + 10 pages of An-Nur = 20 = 1 juz, even though
  // neither juz is fully complete on its own.
  const memorisedJuzCount = approximateJuzMemorised(pages)
  const pct = Math.round((memorisedCount / 604) * 100)

  const learningPages = pages
    .filter((p) => p.status === 'learning')
    .sort((a, b) => a.page_number - b.page_number)

  if (pagesLoading || !settings) {
    return (
      <div className="min-h-screen bg-[#0b0e14] flex items-center justify-center text-slate-400">
        Loading…
      </div>
    )
  }

  return (
    <PageTransition>
    <div className="min-h-screen bg-[#0b0e14] text-white pb-24 md:pb-10">
      <div className="max-w-lg md:max-w-4xl lg:max-w-5xl mx-auto px-4 md:px-8 pt-5 md:pt-10">
        <QuoteOfTheDay />
        <StreakBar />
        <div className="flex justify-between items-center mb-5">
          <h1 className="text-xl font-bold">My Hifz</h1>
        </div>

        <div className="glass rounded-3xl p-5 md:p-6 mb-5 relative overflow-hidden">
          <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
          <div className="text-xs uppercase tracking-widest text-slate-500 mb-1">
            Memorised
          </div>
          <div className="text-4xl md:text-5xl font-extrabold text-gradient">
            {memorisedJuzCount} Juz
          </div>
          <div className="text-sm text-slate-400 mt-1">
            {memorisedCount} of 604 pages · {pct}% complete
          </div>
          <div className="bg-white/[0.06] rounded-full h-2 mt-4 overflow-hidden">
            <div
              className="bg-gradient-to-r from-indigo-500 to-violet-400 h-full rounded-full transition-[width] duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <div className="text-xs uppercase tracking-widest text-slate-500 mb-2">
          New Memorisation
        </div>
        {learningPages.length > 0 && (
          <div className="glass rounded-3xl p-5 mb-3 relative overflow-hidden">
            <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />
            <div className="flex justify-between items-start mb-2">
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md">
                Currently Learning
              </span>
              <span className="text-slate-400 text-xs font-semibold">
                Page {learningPages[0].page_number}
              </span>
            </div>
            <div className="text-white font-bold text-lg mb-1">
              {learningPages[0].pages.surah_name} — Juz {learningPages[0].pages.juz}
            </div>
            {learningPages.length > 1 && (
              <div className="text-slate-400 text-xs mb-1">
                +{learningPages.length - 1} more {learningPages.length - 1 === 1 ? 'page' : 'pages'} queued
              </div>
            )}
            <button
              onClick={() => navigate('/memorise')}
              className="btn-gradient w-full text-white rounded-xl py-3 text-sm font-bold mt-3"
            >
              Open Session
            </button>
          </div>
        )}
        <button
          onClick={() => navigate('/pick-surah')}
          className="w-full bg-white/[0.03] border border-dashed border-white/15 text-slate-300 hover:text-white hover:border-indigo-500/50 transition-colors rounded-2xl py-4 text-sm font-semibold mb-5"
        >
          + Pick a surah to memorise
        </button>

        <div className="text-xs uppercase tracking-widest text-slate-500 mb-2">
          Revision
        </div>

        <div className="glass rounded-3xl p-5 mb-3 relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />
          <div className="flex items-start justify-between mb-1">
            <div className="text-[10px] uppercase tracking-widest text-emerald-300/90">
              Daily reading · 1 juz
            </div>
            {reading.loops > 0 && (
              <div className="text-[10px] uppercase tracking-widest text-emerald-400/80 bg-emerald-500/10 border border-emerald-400/20 rounded-md px-2 py-0.5">
                Loops {reading.loops}
              </div>
            )}
          </div>
          {settings?.reading_last_completed_date === today ? (
            <>
              <div className="text-lg font-bold mb-1">
                Today’s reading complete 🌙
              </div>
              <div className="text-xs text-slate-400 mb-3">
                Well done — you finished a whole juz today. Next juz unlocks tomorrow.
              </div>
              <button
                disabled
                className="btn-gradient w-full text-white rounded-xl py-3 text-sm font-bold opacity-40"
              >
                ✓ Complete for today
              </button>
              <button
                onClick={() => {
                  updateSettings({ reading_last_completed_date: null })
                  navigate('/revise/reading')
                }}
                className="w-full mt-2 text-xs text-slate-500 hover:text-slate-300 py-1.5"
              >
                Do another juz today →
              </button>
            </>
          ) : (
            <>
              <div className="text-lg font-bold mb-1">
                {reading.cycleLength === 0
                  ? 'Nothing in your hifz yet'
                  : readingRange}
              </div>
              <div className="text-xs text-slate-400 mb-3">
                {reading.cycleLength === 0
                  ? 'Add memorised pages via the surah picker to start the cycle.'
                  : reading.cursorWithinBatch > 0
                    ? `Resume at page ${reading.cursorWithinBatch + 1} of ${reading.sessionPages.length}.`
                    : `${reading.sessionPages.length} pages. Just read each one and tap Next.`}
              </div>
              <button
                onClick={() => navigate('/revise/reading')}
                disabled={reading.cycleLength === 0}
                className="btn-gradient w-full text-white rounded-xl py-3 text-sm font-bold disabled:opacity-40"
              >
                {reading.cycleLength === 0
                  ? 'Add pages first'
                  : reading.cursorWithinBatch > 0
                    ? `Resume at page ${reading.cursorWithinBatch + 1} →`
                    : `Start Juz ${reading.currentJuz} →`}
              </button>
              {reading.cursorWithinBatch > 0 && reading.currentJuz !== null && (
                <button
                  onClick={() =>
                    updateSettings({ reading_cursor: reading.batchStart })
                  }
                  className="w-full mt-2 text-xs text-slate-500 hover:text-slate-300 py-1.5"
                >
                  ↺ Restart Juz {reading.currentJuz} from page 1
                </button>
              )}
            </>
          )}
        </div>

        <button
          onClick={() => navigate('/revise')}
          disabled={algoSnapshotTotal === 0 && !algoCompletedToday}
          className="w-full glass rounded-3xl p-5 mb-5 relative overflow-hidden text-left disabled:opacity-50"
        >
          <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-purple-500/20 blur-3xl pointer-events-none" />
          <div className="flex items-start justify-between mb-1">
            <div className="text-[10px] uppercase tracking-widest text-purple-300/90">
              Algorithm revision · up to 4 pages
            </div>
            {algoSnapshotActive && (
              <div className="text-[10px] uppercase tracking-widest text-purple-400/80 bg-purple-500/10 border border-purple-400/20 rounded-md px-2 py-0.5">
                {algoSnapshotDone}/{algoSnapshotTotal} done
              </div>
            )}
          </div>
          <div className="text-lg font-bold mb-1">
            {algoCompletedToday
              ? 'All done for today ✓'
              : algoSnapshotTotal === 0
                ? 'Nothing due today'
                : algoSnapshotActive
                  ? `${algoRemaining} ${algoRemaining === 1 ? 'page' : 'pages'} remaining`
                  : `${algoSnapshotTotal} ${algoSnapshotTotal === 1 ? 'page' : 'pages'} due`}
          </div>
          <div className="text-xs text-slate-400 leading-relaxed">
            {algoCompletedToday
              ? 'A fresh batch will be picked tomorrow.'
              : algoSnapshotTotal === 0
                ? 'Check back tomorrow.'
                : algoSnapshotActive
                  ? `Batch locked in — same pages carry forward until you finish all ${algoSnapshotTotal}.`
                  : `${tasks.recentPages.length} recent + ${tasks.spacedPages.length} algorithm-picked (most overdue + weakest). Rate weak/okay/strong.`}
          </div>
        </button>

        <div className="mb-5">
          <JuzStrengthMap userPages={pages} />
        </div>

        <RepStatsCard />
      </div>
    </div>
    </PageTransition>
  )
}
