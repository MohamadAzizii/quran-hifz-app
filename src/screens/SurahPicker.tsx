import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { SURAHS, type SurahRange } from '../lib/surahs'
import {
  useReplaceLearningWithSurah,
  useUserPagesQuery,
} from '../hooks/useUserPages'
import { PageTransition } from '../components/PageTransition'

function pageCount(s: SurahRange): number {
  return s.endPage - s.startPage + 1
}

function pageLabel(s: SurahRange): string {
  return s.startPage === s.endPage ? `p. ${s.startPage}` : `p. ${s.startPage}–${s.endPage}`
}

export function SurahPicker() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [pendingSurah, setPendingSurah] = useState<SurahRange | null>(null)
  const replace = useReplaceLearningWithSurah()
  const { data: userPages = [] } = useUserPagesQuery()

  const currentLearning = userPages.find((p) => p.status === 'learning') ?? null

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return SURAHS
    return SURAHS.filter(
      (s) =>
        String(s.number).includes(q) ||
        s.name.toLowerCase().includes(q) ||
        s.arabicName.includes(query.trim())
    )
  }, [query])

  const confirmText = (() => {
    if (!pendingSurah) return ''
    const n = pageCount(pendingSurah)
    if (currentLearning) {
      return `This will end your progress on page ${currentLearning.page_number} and replace it with ${pendingSurah.name} (${n} ${n === 1 ? 'page' : 'pages'}). Continue?`
    }
    return `Add ${n} ${n === 1 ? 'page' : 'pages'} of ${pendingSurah.name} to your memorisation queue?`
  })()

  const handleConfirm = async () => {
    if (!pendingSurah) return
    const added = await replace.mutateAsync({
      startPage: pendingSurah.startPage,
      endPage: pendingSurah.endPage,
    })
    setPendingSurah(null)
    if (added === 0) {
      // User has already memorised every page of this surah
      alert(`You've already memorised every page of ${pendingSurah.name}.`)
      return
    }
    navigate('/memorise')
  }

  return (
    <PageTransition>
    <div className="min-h-screen bg-[#0f1117] text-white px-4 pt-5 pb-24 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => navigate('/')}
          className="bg-[#1e293b] text-slate-400 rounded-lg px-3 py-2 text-sm"
          aria-label="Back to dashboard"
        >
          ← Back
        </button>
        <h1 className="text-lg font-bold flex-1">Pick a surah</h1>
      </div>

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name or number…"
        className="w-full bg-[#1e293b] border border-[#334155] text-white placeholder-slate-500 rounded-xl px-4 py-3 mb-4 text-sm outline-none focus:border-blue-500"
      />

      <motion.div
        className="flex flex-col gap-2"
        initial="hidden"
        animate="visible"
        variants={{
          visible: { transition: { staggerChildren: 0.01, delayChildren: 0.05 } },
        }}
      >
        {filtered.length === 0 && (
          <div className="text-slate-500 text-sm text-center py-8">
            No surahs match "{query}".
          </div>
        )}
        {filtered.map((s) => (
          <motion.button
            key={s.number}
            onClick={() => setPendingSurah(s)}
            variants={{
              hidden: { opacity: 0, y: 8 },
              visible: { opacity: 1, y: 0 },
            }}
            whileTap={{ scale: 0.97 }}
            className="bg-[#1e293b] hover:bg-[#293548] active:bg-[#293548] transition-colors text-left rounded-xl p-3 flex items-center gap-3"
          >
            <div className="bg-[#0f172a] text-slate-400 w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0">
              {s.number}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-white truncate">
                {s.name}
              </div>
              <div className="text-xs text-slate-500">{pageLabel(s)}</div>
            </div>
            <div
              dir="rtl"
              lang="ar"
              className="text-lg text-slate-200 flex-shrink-0"
            >
              {s.arabicName}
            </div>
          </motion.button>
        ))}
      </motion.div>

      <AnimatePresence>
      {pendingSurah && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-4"
          onClick={() => setPendingSurah(null)}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
            className="bg-[#1e293b] rounded-2xl p-5 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-base font-bold text-white mb-2">
              Pick {pendingSurah.name}?
            </div>
            <div className="text-sm text-slate-400 mb-5">{confirmText}</div>
            <div className="flex gap-2">
              <button
                onClick={() => setPendingSurah(null)}
                disabled={replace.isPending}
                className="flex-1 bg-[#0f172a] border border-[#334155] text-slate-400 rounded-xl py-3 font-semibold text-sm disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={replace.isPending}
                className="flex-1 bg-blue-600 text-white rounded-xl py-3 font-bold text-sm disabled:opacity-40"
              >
                {replace.isPending ? 'Adding…' : 'Confirm'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
    </PageTransition>
  )
}
