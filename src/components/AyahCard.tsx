import { useRef, useState } from 'react'
import type { AyahCache } from '../types'

interface Props {
  ayahs: AyahCache[]
  pageNumber: number
  surahName: string
  juz?: number
  hizb?: number
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

export function AyahCard({
  ayahs,
  pageNumber,
  surahName,
  juz,
  hizb,
  defaultHidden = false,
}: Props) {
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
    <div className="bg-[#151a23] rounded-2xl p-5 mb-3 relative">
      {hidden && (
        <div
          onPointerDown={beginPress}
          onPointerUp={cancelPress}
          onPointerLeave={cancelPress}
          onPointerCancel={cancelPress}
          role="button"
          aria-label="Hold to reveal page text"
          tabIndex={0}
          className="absolute inset-0 rounded-2xl bg-[#0b0e14]/95 flex flex-col items-center justify-center gap-2 cursor-pointer z-10 select-none"
        >
          <span className="text-slate-500 font-semibold">Text hidden</span>
          <span className="text-slate-600 text-sm">Press and hold to reveal</span>
          <div className="w-32 h-1.5 bg-[#151a23] rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 transition-[width] duration-75"
              style={{ width: `${revealProgress}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-5 text-slate-400 text-sm">
        <span className="font-semibold text-slate-200">{surahName}</span>
        <span className="text-xs">
          {juz != null && <>Juz {juz}</>}
          {juz != null && hizb != null && ' · '}
          {hizb != null && <>Hizb {hizb}</>}
        </span>
      </div>

      <div
        className="quran-text mushaf-page text-slate-100"
        dir="rtl"
        lang="ar"
      >
        {sorted.map((a, i) => {
          const verseNum = verseNumberFromKey(a.ayah_key)
          return (
            <span key={a.ayah_key}>
              {i > 0 && ' '}
              {a.text_uthmani}
              {' '}
              <span
                className="inline-flex items-center justify-center w-7 h-7 mx-0.5 text-xs font-bold text-amber-400 border border-amber-400/50 rounded-full align-middle select-none"
                aria-label={`Verse ${verseNum}`}
                style={{ fontFamily: 'system-ui, sans-serif' }}
              >
                {toArabicIndic(verseNum)}
              </span>
            </span>
          )
        })}
      </div>

      <div className="text-center text-slate-500 text-sm mt-5">
        {pageNumber}
      </div>

      <button
        onClick={() => setHidden((h) => !h)}
        className="mt-4 w-full bg-[#0f131b] border border-white/[0.08] text-slate-400 rounded-xl py-2 text-sm font-semibold"
      >
        {hidden ? 'Reveal text' : 'Hide text (test yourself)'}
      </button>
    </div>
  )
}
