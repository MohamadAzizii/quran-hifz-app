import { useEffect, useState } from 'react'
import { useRepStats, type RepWindow } from '../hooks/useRepStats'

const STORAGE_KEY = 'rep-stats-window'

const OPTIONS: { id: RepWindow; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'all', label: 'All' },
]

function loadWindow(): RepWindow {
  if (typeof window === 'undefined') return 'today'
  const v = localStorage.getItem(STORAGE_KEY)
  return v === 'today' || v === 'week' || v === 'month' || v === 'all' ? v : 'today'
}

export function RepStatsCard() {
  const [windowSel, setWindowSel] = useState<RepWindow>(() => loadWindow())
  const { data, isLoading } = useRepStats(windowSel)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, windowSel)
  }, [windowSel])

  const total = data?.total ?? 0
  const withMushaf = data?.withMushaf ?? 0
  const fromMemory = data?.fromMemory ?? 0
  const revision = data?.revision ?? 0

  return (
    <div className="bg-[#1e293b] rounded-2xl p-4 mb-5">
      <div className="text-xs uppercase tracking-widest text-slate-500 mb-3">
        Repetitions
      </div>

      <div className="bg-[#0f172a] rounded-xl p-1 flex gap-1 mb-4">
        {OPTIONS.map((o) => (
          <button
            key={o.id}
            onClick={() => setWindowSel(o.id)}
            className={`flex-1 text-xs font-semibold rounded-lg py-2 transition-colors ${
              windowSel === o.id
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      <div className="text-center mb-3">
        <div className="text-4xl font-extrabold text-amber-400">
          {isLoading ? '…' : total.toLocaleString()}
        </div>
        <div className="text-xs text-slate-500 uppercase tracking-widest mt-1">
          total reps
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-[#0f172a] rounded-lg py-2">
          <div className="text-base font-bold text-slate-200">{withMushaf}</div>
          <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">
            With mushaf
          </div>
        </div>
        <div className="bg-[#0f172a] rounded-lg py-2">
          <div className="text-base font-bold text-slate-200">{fromMemory}</div>
          <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">
            From memory
          </div>
        </div>
        <div className="bg-[#0f172a] rounded-lg py-2">
          <div className="text-base font-bold text-slate-200">{revision}</div>
          <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">
            Revision
          </div>
        </div>
      </div>
    </div>
  )
}
