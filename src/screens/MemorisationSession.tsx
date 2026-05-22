import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  useUserPagesQuery,
  useAddPage,
  useAdvanceProgress,
} from '../hooks/useUserPages'
import { useSettings } from '../hooks/useSettings'
import { useAyahCache } from '../hooks/useAyahCache'
import { useSession } from '../hooks/useSession'
import { MushafImage } from '../components/MushafImage'
import { PageTransition } from '../components/PageTransition'
import { RepCounter } from '../components/RepCounter'
import { nextPortion } from '../lib/portion'

export function MemorisationSession() {
  const navigate = useNavigate()
  const { data: pages = [] } = useUserPagesQuery()
  const addPage = useAddPage()
  const advance = useAdvanceProgress()
  const { settings } = useSettings()
  const { startSession, logMemorisation, completeSession } = useSession()

  const learningPages = pages
    .filter((p) => p.status === 'learning')
    .sort((a, b) => a.page_number - b.page_number)
  const currentPage = learningPages[0] ?? null

  const { ayahs } = useAyahCache(currentPage?.page_number ?? null)
  const portion =
    currentPage && settings
      ? nextPortion(ayahs, currentPage.progress_ayah_key, settings.daily_target)
      : null

  const [repsWithMushaf, setRepsWithMushaf] = useState(0)
  const [repsFromMemory, setRepsFromMemory] = useState(0)
  const [sessionStarted, setSessionStarted] = useState(false)

  const mushafTarget = settings?.memorisation_reps_mushaf ?? 12
  const memoryTarget = settings?.memorisation_reps_memory ?? 8

  if (!settings) return <div className="min-h-screen bg-[#0b0e14]" />

  if (!currentPage) {
    const nextPageNum = Math.max(0, ...pages.map((p) => p.page_number)) + 1
    return (
      <div className="min-h-screen bg-[#0b0e14] text-white px-4 md:px-8 pt-5 md:pt-10 pb-24 md:pb-10 max-w-lg md:max-w-3xl mx-auto">
        <button
          onClick={() => navigate('/')}
          className="bg-[#151a23] text-slate-400 rounded-lg px-3 py-2 text-sm mb-5"
        >
          ← Back
        </button>
        <h1 className="text-xl font-bold mb-6">New Memorisation</h1>
        <p className="text-slate-400 text-sm mb-6">Start with page {nextPageNum}.</p>
        <button
          onClick={() => addPage.mutate(nextPageNum)}
          disabled={addPage.isPending}
          className="btn-gradient w-full text-white rounded-2xl py-4 text-base font-bold disabled:opacity-50"
        >
          {addPage.isPending ? 'Adding…' : `Start Page ${nextPageNum}`}
        </button>
      </div>
    )
  }

  const handleStart = async () => {
    await startSession('memorisation')
    setSessionStarted(true)
  }

  const handleFinishPortion = async () => {
    if (!portion || portion.ayahs.length === 0 || !currentPage) return
    const lastAyah = portion.ayahs[portion.ayahs.length - 1]

    await logMemorisation(currentPage.page_number, repsWithMushaf, repsFromMemory)

    if (portion.isLastPortion) {
      await advance.mutateAsync({
        page_number: currentPage.page_number,
        progress_ayah_key: lastAyah.ayah_key,
        graduate: true,
      })
      await completeSession(1)
      navigate('/')
    } else {
      await advance.mutateAsync({
        page_number: currentPage.page_number,
        progress_ayah_key: lastAyah.ayah_key,
      })
      await completeSession(0)
      setRepsWithMushaf(0)
      setRepsFromMemory(0)
      setSessionStarted(false)
    }
  }

  const portionLabel = portion?.ayahs.length
    ? `${portion.ayahs[0].ayah_key} → ${portion.ayahs[portion.ayahs.length - 1].ayah_key}`
    : 'No portion remaining'

  return (
    <PageTransition>
    <div className="min-h-screen bg-[#0b0e14] text-white px-4 md:px-8 pt-5 md:pt-10 pb-24 md:pb-10 max-w-lg md:max-w-3xl lg:max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => navigate('/')}
          className="bg-[#151a23] text-slate-400 rounded-lg px-3 py-2 text-sm"
          aria-label="Back to dashboard"
        >
          ← Back
        </button>
        <h1 className="text-lg font-bold flex-1">New Memorisation</h1>
        <div className="bg-[#151a23] rounded-lg px-3 py-1.5 text-xs text-slate-400 font-semibold">
          Page {currentPage.page_number}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-6 lg:items-start">
        <div className="lg:order-1">
          <MushafImage
            pageNumber={currentPage.page_number}
            surahName={currentPage.pages.surah_name}
            juz={currentPage.pages.juz}
            hizb={currentPage.pages.hizb}
            defaultHidden={false}
          />
        </div>

        <div className="lg:order-2 lg:sticky lg:top-10 lg:self-start">
          <div className="bg-[#151a23] rounded-xl p-3 mb-3 text-xs text-slate-400">
            Portion: <span className="text-white font-bold">{portionLabel}</span>
            {' · '}
            {portion?.isLastPortion ? 'final portion of page' : 'partial'}
          </div>

          {!sessionStarted ? (
            <button
              onClick={handleStart}
              className="btn-gradient w-full text-white rounded-2xl py-4 text-base font-bold mb-4"
            >
              Start Session
            </button>
          ) : (
            <div className="bg-[#151a23] rounded-2xl p-4 mb-4">
              <div className="text-xs uppercase tracking-widest text-slate-500 mb-4">
                Track Repetitions
              </div>
              <RepCounter
                label="📖 With Mushaf"
                count={repsWithMushaf}
                target={mushafTarget}
                color="blue"
                onAdd={() => setRepsWithMushaf((r) => r + 1)}
              />
              <div className="h-px bg-[#0f131b] my-3" />
              <RepCounter
                label="🧠 From Memory"
                count={repsFromMemory}
                target={memoryTarget}
                color="purple"
                onAdd={() => setRepsFromMemory((r) => r + 1)}
              />
            </div>
          )}

          {sessionStarted && (
            <button
              onClick={handleFinishPortion}
              disabled={
                advance.isPending ||
                (repsWithMushaf < mushafTarget && repsFromMemory < memoryTarget)
              }
              className="btn-gradient w-full text-white rounded-xl py-3 font-bold text-sm disabled:opacity-40"
            >
              {portion?.isLastPortion ? '✓ Mark page as memorised' : '✓ Mark portion done'}
            </button>
          )}
        </div>
      </div>
    </div>
    </PageTransition>
  )
}
