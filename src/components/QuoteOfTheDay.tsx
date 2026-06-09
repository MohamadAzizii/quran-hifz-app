import { useState } from 'react'
import { QURAN_QUOTES } from '../data/quran-quotes'

// Sequential rotation across QURAN_QUOTES, persisted to localStorage so each
// landing on the dashboard advances by one and cycles through the whole list
// before repeating. Lazy useState initializer runs once per mount = once per
// Dashboard visit.
const STORAGE_KEY = 'quote-rotation-index'

function nextIndex(): number {
  if (typeof window === 'undefined') return 0
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const last = Number.parseInt(raw ?? '-1', 10)
    const safe = Number.isFinite(last) ? last : -1
    const next = (safe + 1) % QURAN_QUOTES.length
    window.localStorage.setItem(STORAGE_KEY, String(next))
    return next
  } catch {
    return 0
  }
}

export function QuoteOfTheDay() {
  const [baseIndex] = useState(nextIndex)
  const [offset, setOffset] = useState(0)
  const quote = QURAN_QUOTES[(baseIndex + offset) % QURAN_QUOTES.length]

  return (
    <div className="glass rounded-3xl p-5 mb-3 relative overflow-hidden">
      <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-amber-500/15 blur-3xl pointer-events-none" />
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] uppercase tracking-widest text-amber-300/90">
          {quote.type === 'verse' ? 'Verse · reminder' : 'Hadith · reminder'}
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
