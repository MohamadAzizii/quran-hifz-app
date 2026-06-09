import { useMemo, useState } from 'react'
import { QURAN_QUOTES } from '../data/quran-quotes'

// Day-of-year mod list length → quote rotates daily but is deterministic for
// today. The shuffle button lets the user spin through other quotes if they
// want; doesn't persist.
function dayOfYear(d: Date): number {
  const start = Date.UTC(d.getFullYear(), 0, 0)
  const now = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
  return Math.floor((now - start) / 86_400_000)
}

export function QuoteOfTheDay() {
  const baseIndex = useMemo(
    () => dayOfYear(new Date()) % QURAN_QUOTES.length,
    []
  )
  const [offset, setOffset] = useState(0)
  const quote = QURAN_QUOTES[(baseIndex + offset) % QURAN_QUOTES.length]

  return (
    <div className="glass rounded-3xl p-5 mb-3 relative overflow-hidden">
      <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-amber-500/15 blur-3xl pointer-events-none" />
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] uppercase tracking-widest text-amber-300/90">
          {quote.type === 'verse' ? 'Verse' : 'Hadith'} of the day
        </div>
        <button
          onClick={() => setOffset((o) => o + 1)}
          className="text-[10px] uppercase tracking-widest text-slate-500 hover:text-slate-300"
          aria-label="Next quote"
        >
          ↻ another
        </button>
      </div>

      <p
        dir="rtl"
        lang="ar"
        className="text-right text-base md:text-lg leading-loose text-white font-arabic mb-3"
        style={{ fontFamily: '"KFGQPC HafsUthmanic", "Amiri", "Scheherazade", serif' }}
      >
        {quote.arabic}
      </p>

      <p className="text-sm text-slate-200 leading-relaxed mb-2">
        “{quote.english}”
      </p>

      <div className="text-[11px] text-slate-500">
        {quote.reference}
        {quote.grade && (
          <span className="ml-2 text-slate-600">· {quote.grade}</span>
        )}
      </div>
    </div>
  )
}
