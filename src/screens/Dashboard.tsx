import { useNavigate } from 'react-router-dom'
import { useUserPagesQuery } from '../hooks/useUserPages'
import { useTodaysTasks } from '../hooks/useTodaysTasks'
import { useSettings } from '../hooks/useSettings'
import { useAutoGraduate } from '../hooks/useAutoGraduate'
import { BottomNav } from '../components/BottomNav'
import { JuzStrengthMap } from '../components/JuzStrengthMap'
import type { DailyTarget } from '../types'

const TARGET_LABELS: Record<DailyTarget, string> = {
  quarter: '¼ page',
  half: '½ page',
  one: '1 page',
  two: '2 pages',
}

const TARGET_OPTIONS: DailyTarget[] = ['quarter', 'half', 'one', 'two']

export function Dashboard() {
  useAutoGraduate()
  const navigate = useNavigate()
  const { data: pages = [], isLoading: pagesLoading } = useUserPagesQuery()
  const { tasks } = useTodaysTasks()
  const { settings, updateSettings } = useSettings()

  const memorisedCount = pages.filter(
    (p) => p.status === 'memorised' || p.status === 'recent'
  ).length
  const memorisedJuzCount = new Set(
    pages
      .filter((p) => p.status === 'memorised' || p.status === 'recent')
      .map((p) => p.pages.juz)
  ).size
  const pct = Math.round((memorisedCount / 604) * 100)

  const learningPages = pages.filter((p) => p.status === 'learning')

  if (pagesLoading || !settings) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center text-slate-400">
        Loading…
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f1117] text-white pb-24">
      <div className="max-w-lg mx-auto px-4 pt-5">
        <div className="flex justify-between items-center mb-5">
          <h1 className="text-xl font-bold">My Hifz</h1>
        </div>

        <div className="bg-gradient-to-br from-[#1e3a5f] to-[#1a2e4a] border border-[#2d4a6e] rounded-2xl p-4 mb-5">
          <div className="text-xs uppercase tracking-widest text-slate-500 mb-1">
            Memorised
          </div>
          <div className="text-3xl font-extrabold text-blue-400">
            {memorisedJuzCount} Juz
          </div>
          <div className="text-sm text-slate-400 mt-1">
            {memorisedCount} of 604 pages · {pct}% complete
          </div>
          <div className="bg-[#0f172a] rounded-full h-1.5 mt-3">
            <div
              className="bg-gradient-to-r from-blue-600 to-blue-400 h-1.5 rounded-full"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <div className="text-xs uppercase tracking-widest text-slate-500 mb-2">
          Daily Target
        </div>
        <div className="bg-[#1e293b] rounded-xl p-3 flex gap-2 mb-5">
          {TARGET_OPTIONS.map((t) => (
            <button
              key={t}
              onClick={() => updateSettings({ daily_target: t })}
              className={`flex-1 py-2 rounded-full text-xs font-semibold transition-colors
                ${
                  settings.daily_target === t
                    ? 'bg-blue-700 text-white'
                    : 'bg-[#0f172a] text-slate-500 border border-[#334155]'
                }`}
            >
              {TARGET_LABELS[t]}
            </button>
          ))}
        </div>

        <div className="text-xs uppercase tracking-widest text-slate-500 mb-2">
          New Memorisation
        </div>
        {learningPages.length > 0 ? (
          <div className="bg-gradient-to-br from-[#052e16] to-[#14532d] border border-green-800 rounded-2xl p-4 mb-5">
            <div className="flex justify-between items-start mb-2">
              <span className="bg-green-700 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md">
                Currently Learning
              </span>
              <span className="text-green-400 text-xs font-semibold">
                Page {learningPages[0].page_number}
              </span>
            </div>
            <div className="text-white font-bold text-base mb-1">
              {learningPages[0].pages.surah_name} — Juz {learningPages[0].pages.juz}
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => navigate('/memorise')}
                className="flex-1 bg-green-700 text-white rounded-xl py-2.5 text-sm font-bold"
              >
                Open Session
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => navigate('/memorise')}
            className="w-full bg-green-950 border border-dashed border-green-800 text-green-400 rounded-2xl py-4 text-sm font-semibold mb-5"
          >
            + Start memorising a new page
          </button>
        )}

        <div className="text-xs uppercase tracking-widest text-slate-500 mb-2">
          Today's Revision — {tasks.recentPages.length + tasks.spacedPages.length} pages
        </div>
        <div className="flex flex-col gap-2 mb-5">
          {tasks.recentPages.length > 0 && (
            <div className="bg-[#1e293b] border-l-4 border-amber-500 rounded-xl p-3 flex items-center gap-3">
              <div className="bg-amber-500/15 w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0">
                🔁
              </div>
              <div className="flex-1">
                <div className="text-[10px] uppercase tracking-widest text-slate-500">
                  Recent
                </div>
                <div className="text-sm font-semibold">
                  {tasks.recentPages.length} pages due
                </div>
              </div>
              <div className="bg-[#0f172a] rounded-lg px-3 py-1 text-sm font-bold text-slate-400">
                ~10 reps/pg
              </div>
            </div>
          )}
          {tasks.spacedPages.length > 0 && (
            <div className="bg-[#1e293b] border-l-4 border-purple-500 rounded-xl p-3 flex items-center gap-3">
              <div className="bg-purple-500/15 w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0">
                🧠
              </div>
              <div className="flex-1">
                <div className="text-[10px] uppercase tracking-widest text-slate-500">
                  Spaced Revision
                </div>
                <div className="text-sm font-semibold">
                  {tasks.spacedPages.length} pages due
                </div>
              </div>
              <div className="bg-[#0f172a] rounded-lg px-3 py-1 text-sm font-bold text-slate-400">
                5–15 reps/pg
              </div>
            </div>
          )}
          {tasks.recentPages.length === 0 && tasks.spacedPages.length === 0 && (
            <div className="text-slate-500 text-sm text-center py-4">
              No revision due today 🎉
            </div>
          )}
        </div>

        <div className="mb-5">
          <JuzStrengthMap userPages={pages} />
        </div>

        {(tasks.recentPages.length > 0 || tasks.spacedPages.length > 0) && (
          <button
            onClick={() => navigate('/revise')}
            className="w-full bg-gradient-to-r from-blue-700 to-blue-500 text-white rounded-2xl py-4 text-base font-bold"
          >
            Start Today's Revision →
          </button>
        )}
      </div>
      <BottomNav />
    </div>
  )
}
