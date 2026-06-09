import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserPagesQuery } from '../hooks/useUserPages'
import { useTodaysTasks } from '../hooks/useTodaysTasks'
import { useSettings } from '../hooks/useSettings'
import { useDeviceSettings } from '../hooks/useDeviceSettings'
import { useAutoGraduate } from '../hooks/useAutoGraduate'
import { JuzStrengthMap } from '../components/JuzStrengthMap'
import { RepStatsCard } from '../components/RepStatsCard'
import { PageTransition } from '../components/PageTransition'
import {
  getReadingFocus,
  type UserPageWithJuz,
} from '../lib/reading-cycle'

export function Dashboard() {
  useAutoGraduate()
  const navigate = useNavigate()
  const { data: pages = [], isLoading: pagesLoading } = useUserPagesQuery()
  const { tasks } = useTodaysTasks()
  const { settings } = useSettings()
  const { settings: device } = useDeviceSettings()

  const reading = useMemo(
    () =>
      getReadingFocus(
        pages as UserPageWithJuz[],
        device.readingCursor,
        device.readingLoops
      ),
    [pages, device.readingCursor, device.readingLoops]
  )
  const readingFirst = reading.sessionPages[0]
  const readingLast = reading.sessionPages[reading.sessionPages.length - 1]
  const readingRange =
    readingFirst && readingLast
      ? readingFirst.pages.juz === readingLast.pages.juz
        ? `Juz ${readingFirst.pages.juz} · Pages ${readingFirst.page_number}–${readingLast.page_number}`
        : `Juz ${readingFirst.pages.juz} → Juz ${readingLast.pages.juz} · Pages ${readingFirst.page_number}–${readingLast.page_number}`
      : ''
  const algorithmCount = tasks.recentPages.length + tasks.spacedPages.length

  const memorisedCount = pages.filter(
    (p) => p.status === 'memorised' || p.status === 'recent'
  ).length
  const memorisedJuzCount = new Set(
    pages
      .filter((p) => p.status === 'memorised' || p.status === 'recent')
      .map((p) => p.pages.juz)
  ).size
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

        <button
          onClick={() => navigate('/revise/reading')}
          className="w-full glass rounded-3xl p-5 mb-3 relative overflow-hidden text-left"
        >
          <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />
          <div className="flex items-start justify-between mb-1">
            <div className="text-[10px] uppercase tracking-widest text-emerald-300/90">
              Daily reading · ~1.5 juz
            </div>
            {reading.loops > 0 && (
              <div className="text-[10px] uppercase tracking-widest text-emerald-400/80 bg-emerald-500/10 border border-emerald-400/20 rounded-md px-2 py-0.5">
                Loops {reading.loops}
              </div>
            )}
          </div>
          <div className="text-lg font-bold mb-1">
            {reading.cycleLength === 0
              ? 'Nothing in your hifz yet'
              : readingRange}
          </div>
          <div className="text-xs text-slate-400">
            {reading.cycleLength === 0
              ? 'Add memorised pages via the surah picker to start the cycle.'
              : reading.cursorWithinBatch > 0
                ? `Resume at page ${reading.cursorWithinBatch + 1} of ${reading.sessionPages.length}.`
                : `${reading.sessionPages.length} pages. Just read each one and tap Next.`}
          </div>
        </button>

        <button
          onClick={() => navigate('/revise')}
          disabled={algorithmCount === 0}
          className="w-full glass rounded-3xl p-5 mb-5 relative overflow-hidden text-left disabled:opacity-50"
        >
          <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-purple-500/20 blur-3xl pointer-events-none" />
          <div className="text-[10px] uppercase tracking-widest text-purple-300/90 mb-1">
            Algorithm revision · up to 4 pages
          </div>
          <div className="text-lg font-bold mb-1">
            {algorithmCount === 0
              ? 'Nothing due today'
              : `${algorithmCount} ${algorithmCount === 1 ? 'page' : 'pages'} due`}
          </div>
          <div className="text-xs text-slate-400 leading-relaxed">
            {algorithmCount === 0
              ? 'Check back tomorrow.'
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
