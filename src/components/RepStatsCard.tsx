import { useEffect, useState } from 'react'
import { animate, motion, useMotionValue, useTransform } from 'framer-motion'
import { useRepStats, type RepWindow } from '../hooks/useRepStats'

function AnimatedNumber({ value }: { value: number }) {
  const motionValue = useMotionValue(value)
  const display = useTransform(motionValue, (v) => Math.round(v).toLocaleString())
  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration: 0.6,
      ease: [0.4, 0, 0.2, 1],
    })
    return controls.stop
  }, [value, motionValue])
  return <motion.span>{display}</motion.span>
}

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

  const withMushaf = data?.withMushaf ?? 0
  const fromMemory = data?.fromMemory ?? 0
  const memorisationTotal = withMushaf + fromMemory
  const revisionTotal = data?.revision ?? 0
  const placeholder = isLoading ? '…' : null

  return (
    <div className="bg-[#151a23] rounded-2xl p-4 mb-5">
      <div className="text-xs uppercase tracking-widest text-slate-500 mb-3">
        Repetitions
      </div>

      <div className="bg-[#0f131b] rounded-xl p-1 flex gap-1 mb-4">
        {OPTIONS.map((o) => (
          <button
            key={o.id}
            onClick={() => setWindowSel(o.id)}
            className={`flex-1 text-xs font-semibold rounded-lg py-2 transition-colors ${
              windowSel === o.id
                ? 'bg-indigo-500 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-[#0f131b] rounded-xl p-3 text-center">
          <div className="text-[10px] uppercase tracking-widest text-green-400 font-bold mb-1">
            Memorisation
          </div>
          <div className="text-3xl font-extrabold text-amber-400 mb-1">
            {placeholder ?? <AnimatedNumber value={memorisationTotal} />}
          </div>
          <div className="text-[10px] text-slate-500 leading-tight">
            {withMushaf} mushaf · {fromMemory} memory
          </div>
        </div>
        <div className="bg-[#0f131b] rounded-xl p-3 text-center">
          <div className="text-[10px] uppercase tracking-widest text-purple-400 font-bold mb-1">
            Revision
          </div>
          <div className="text-3xl font-extrabold text-amber-400 mb-1">
            {placeholder ?? <AnimatedNumber value={revisionTotal} />}
          </div>
          <div className="text-[10px] text-slate-500 leading-tight">reps</div>
        </div>
      </div>
    </div>
  )
}
