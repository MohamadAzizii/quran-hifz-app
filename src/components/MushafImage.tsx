import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  pageNumber: number
  surahName: string
  juz?: number
  hizb?: number
  defaultHidden?: boolean
}

const REVEAL_HOLD_MS = 600

function imageUrl(pageNumber: number): string {
  return `https://cdn.jsdelivr.net/gh/QuranHub/quran-pages-images@master/easyquran.com/hafs-tajweed/${pageNumber}.jpg`
}

export function MushafImage({
  pageNumber,
  surahName,
  juz,
  hizb,
  defaultHidden = false,
}: Props) {
  const [hidden, setHidden] = useState(defaultHidden)
  const [loaded, setLoaded] = useState(false)
  const [errored, setErrored] = useState(false)
  const pressTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const [revealProgress, setRevealProgress] = useState(0)

  useEffect(() => {
    setLoaded(false)
    setErrored(false)
  }, [pageNumber])

  // Cached images can finish loading before React attaches onLoad, leaving
  // the image stuck at opacity:0 (white). Check completeness on mount.
  const imgRef = (node: HTMLImageElement | null) => {
    if (node && node.complete) {
      if (node.naturalWidth > 0) setLoaded(true)
      else setErrored(true)
    }
  }

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

  return (
    <div className="bg-[#151a23] rounded-2xl p-4 mb-3">
      <div className="flex justify-between items-center mb-3 text-slate-400 text-sm">
        <span className="font-semibold text-slate-200">{surahName}</span>
        <span className="text-xs">
          {juz != null && <>Juz {juz}</>}
          {juz != null && hizb != null && ' · '}
          {hizb != null && <>Hizb {hizb}</>}
        </span>
      </div>

      <button
        onClick={() => setHidden((h) => !h)}
        className="mb-3 w-full bg-[#0f131b] border border-white/[0.08] text-slate-400 rounded-xl py-2 text-sm font-semibold"
      >
        {hidden ? 'Reveal page' : 'Hide page (test yourself)'}
      </button>

      <div
        className="bg-white rounded-lg overflow-hidden mx-auto relative"
        style={{ aspectRatio: '2 / 3.1', maxWidth: '100%' }}
      >
        {errored ? (
          <div className="w-full h-full flex items-center justify-center text-slate-500 text-sm p-4 text-center">
            Mushaf image unavailable for page {pageNumber}.
          </div>
        ) : (
          <img
            key={pageNumber}
            ref={imgRef}
            src={imageUrl(pageNumber)}
            alt={`Mushaf page ${pageNumber}`}
            onLoad={() => setLoaded(true)}
            onError={() => setErrored(true)}
            className="w-full h-full object-contain"
            style={{ opacity: loaded ? 1 : 0, transition: 'opacity 200ms' }}
          />
        )}

        <AnimatePresence>
          {hidden && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 1.04 }}
              transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
              onPointerDown={beginPress}
              onPointerUp={cancelPress}
              onPointerLeave={cancelPress}
              onPointerCancel={cancelPress}
              role="button"
              aria-label="Hold to reveal mushaf page"
              tabIndex={0}
              className="absolute inset-0 bg-[#0b0e14]/[0.98] flex flex-col items-center justify-center gap-2 cursor-pointer z-10 select-none"
            >
              <span className="text-slate-500 font-semibold">Page hidden</span>
              <span className="text-slate-600 text-sm">Press and hold to reveal</span>
              <div className="w-32 h-1.5 bg-[#151a23] rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 transition-[width] duration-75"
                  style={{ width: `${revealProgress}%` }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="text-center text-slate-500 text-sm mt-3">{pageNumber}</div>
    </div>
  )
}
