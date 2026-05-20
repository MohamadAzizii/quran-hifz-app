import { useRef, useState } from 'react'
import type { AyahCache } from '../types'

interface Props {
  ayahs: AyahCache[]
  pageNumber: number
  surahName: string
  defaultHidden?: boolean
}

const REVEAL_HOLD_MS = 600
const ARABIC_INDIC = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']

function toArabicIndic(n: number): string {
  return String(n)
    .split('')
    .map((d) => ARABIC_INDIC[Number(d)] ?? d)
    .join('')
}

function verseNumberFromKey(key: string): number {
  const after = key.split(':')[1] ?? ''
  return Number(after) || 0
}

export function AyahCard({ ayahs, pageNumber, surahName, defaultHidden = false }: Props) {
  const [hidden, setHidden] = useState(defaultHidden)
  const pressTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const [revealProgress, setRevealProgress] = useState(0)

  const beginPress = () => {
    setRevealProgress(0)
    const startedAt = Date.now()
    pressTimer.current = setInterval(() => {
      const pct = Math.min(100, ((Date.now() - startedAt) / REVEAL_HOLD_MS) * 100)
      setRevealProgress(pct)
      if (pct >= 100) {
        cancelPress()
        setHidden(false)
      }
    }, 16)
  }

  const cancelPress = () => {
    if (pressTimer.current) {
      clearInterval(pressTimer.current)
      pressTimer.current = null
    }
    setRevealProgress(0)
  }

  const sorted = [...ayahs].sort(
    (a, b) => (a.ayah_ordinal ?? 0) - (b.ayah_ordinal ?? 0)
  )

  return (
    <div className="bg-[#1e293b] rounded-2xl p-5 mb-3 relative">
      {hidden && (
        <div
          onPointerDown={beginPress}
          onPointerUp={cancelPress}
          onPointerLeave={cancelPress}
          onPointerCancel={cancelPress}
          role="button"
          aria-label="Hold to reveal ayah text"
          tabIndex={0}
          className="absolute inset-0 rounded-2xl bg-[#0f1117]/95 flex flex-col items-center justify-center gap-2 cursor-pointer z-10 select-none"
        >
          <span className="text-slate-500 font-semibold">Text hidden</span>
          <span className="text-slate-600 text-sm">Press and hold to reveal</span>
          <div className="w-32 h-1.5 bg-[#1e293b] rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-[width] duration-75"
              style={{ width: `${revealProgress}%` }}
            />
          </div>
        </div>
      )}
      <div
        className="text-right text-3xl leading-[2.6] quran-text text-slate-100"
        dir="rtl"
        lang="ar"
      >
        {sorted.map((a, i) => {
          const verseNum = verseNumberFromKey(a.ayah_key)
          return (
            <span key={a.ayah_key}>
              {i > 0 && ' '}
              <span>{a.text_uthmani}</span>
              <span
                className="inline-flex items-center justify-center w-8 h-8 mx-1 text-sm font-bold text-amber-400 border border-amber-400/50 rounded-full align-middle select-none"
                aria-label={`Verse ${verseNum}`}
              >
                {toArabicIndic(verseNum)}
              </span>
            </span>
          )
        })}
      </div>
      <div className="text-xs text-slate-500 mt-3">
        {surahName} · Page {pageNumber}
      </div>
      <button
        onClick={() => setHidden((h) => !h)}
        className="mt-3 w-full bg-[#0f172a] border border-[#334155] text-slate-400 rounded-xl py-2 text-sm font-semibold"
      >
        {hidden ? 'Reveal text' : 'Hide text (test yourself)'}
      </button>
    </div>
  )
}
