import { memo, useState } from 'react'
import {
  useUserPagesQuery,
  useGraduatePage,
  useBulkMarkMemorised,
} from '../hooks/useUserPages'
import { PageTransition } from '../components/PageTransition'
import { SURAHS } from '../lib/surahs'
import type { PageStatus } from '../types'
import type { UserPageWithMeta } from '../hooks/useUserPages'

function getPageColor(page: UserPageWithMeta | undefined): string {
  if (!page) return 'bg-[#0f172a] border border-[#1e293b] text-slate-700'
  if (page.status === 'learning') return 'bg-blue-600 text-white'
  if (page.status === 'recent') return 'bg-amber-500 text-white'
  if (page.strength >= 4) return 'bg-green-700 text-white'
  if (page.strength >= 3) return 'bg-green-500 text-white'
  if (page.strength >= 2) return 'bg-amber-500 text-white'
  return 'bg-red-600 text-white'
}

const PageCell = memo(function PageCell({
  n,
  color,
  selected,
  onClick,
}: {
  n: number
  color: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      aria-label={`Page ${n}${selected ? ', selected' : ''}`}
      className={`aspect-square rounded-sm text-[6px] font-bold flex items-center justify-center ${color} ${selected ? 'ring-1 ring-white' : ''}`}
    >
      {n % 20 === 0 ? n : ''}
    </button>
  )
})

const STATUS_OPTIONS: PageStatus[] = ['learning', 'recent', 'memorised']

const JUZ_RANGES: { juz: number; from: number; to: number }[] = [
  { juz: 1, from: 1, to: 21 },
  { juz: 2, from: 22, to: 41 },
  { juz: 3, from: 42, to: 61 },
  { juz: 4, from: 62, to: 81 },
  { juz: 5, from: 82, to: 101 },
  { juz: 6, from: 102, to: 121 },
  { juz: 7, from: 122, to: 141 },
  { juz: 8, from: 142, to: 161 },
  { juz: 9, from: 162, to: 181 },
  { juz: 10, from: 182, to: 201 },
  { juz: 11, from: 202, to: 221 },
  { juz: 12, from: 222, to: 241 },
  { juz: 13, from: 242, to: 261 },
  { juz: 14, from: 262, to: 281 },
  { juz: 15, from: 282, to: 301 },
  { juz: 16, from: 302, to: 321 },
  { juz: 17, from: 322, to: 341 },
  { juz: 18, from: 342, to: 361 },
  { juz: 19, from: 362, to: 381 },
  { juz: 20, from: 382, to: 401 },
  { juz: 21, from: 402, to: 421 },
  { juz: 22, from: 422, to: 441 },
  { juz: 23, from: 442, to: 461 },
  { juz: 24, from: 462, to: 481 },
  { juz: 25, from: 482, to: 501 },
  { juz: 26, from: 502, to: 521 },
  { juz: 27, from: 522, to: 541 },
  { juz: 28, from: 542, to: 561 },
  { juz: 29, from: 562, to: 581 },
  { juz: 30, from: 582, to: 604 },
]

export function MyQuran() {
  const { data: pages = [] } = useUserPagesQuery()
  const graduate = useGraduatePage()
  const bulkMark = useBulkMarkMemorised()
  const [selected, setSelected] = useState<number | null>(null)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [from, setFrom] = useState(1)
  const [to, setTo] = useState(20)
  const [surahIdx, setSurahIdx] = useState(0)
  const [confirmCount, setConfirmCount] = useState<number | null>(null)

  const pageMap = new Map(pages.map((p) => [p.page_number, p]))
  const selectedPage = selected ? pageMap.get(selected) : null

  const handleBulk = async (lo: number, hi: number) => {
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) return
    const count = await bulkMark.mutateAsync({ from: lo, to: hi })
    setConfirmCount(count)
    setTimeout(() => setConfirmCount(null), 2500)
  }

  return (
    <PageTransition>
    <div className="min-h-screen bg-[#0f1117] text-white pb-24">
      <div className="max-w-lg mx-auto px-4 pt-5">
        <h1 className="text-xl font-bold mb-5">My Quran</h1>

        <button
          onClick={() => setBulkOpen((o) => !o)}
          className="w-full bg-[#1e293b] border border-[#334155] text-slate-200 rounded-xl py-2.5 text-sm font-semibold mb-3"
        >
          {bulkOpen ? '× Close' : '+ Mark range as already memorised'}
        </button>

        {bulkOpen && (
          <div className="bg-[#1e293b] rounded-2xl p-4 mb-4 border border-[#334155]">
            <div className="text-xs uppercase tracking-widest text-slate-500 mb-2">
              Quick: whole juz
            </div>
            <div className="grid grid-cols-6 gap-1.5 mb-4">
              {JUZ_RANGES.map((j) => (
                <button
                  key={j.juz}
                  onClick={() => handleBulk(j.from, j.to)}
                  disabled={bulkMark.isPending}
                  className="bg-[#0f172a] border border-[#334155] text-slate-300 rounded-lg py-1.5 text-xs font-semibold disabled:opacity-50 hover:bg-blue-900"
                >
                  {j.juz}
                </button>
              ))}
            </div>

            <div className="text-xs uppercase tracking-widest text-slate-500 mb-2">
              Or by surah
            </div>
            <div className="flex gap-2 mb-4">
              <select
                value={surahIdx}
                onChange={(e) => setSurahIdx(Number(e.target.value))}
                className="flex-1 bg-[#0f172a] border border-[#334155] text-white rounded-lg px-3 py-2 text-sm appearance-none"
              >
                {SURAHS.map((s, i) => (
                  <option key={s.number} value={i}>
                    {s.number}. {s.name} ({s.startPage === s.endPage ? `p. ${s.startPage}` : `p. ${s.startPage}–${s.endPage}`})
                  </option>
                ))}
              </select>
              <button
                onClick={() => {
                  const s = SURAHS[surahIdx]
                  handleBulk(s.startPage, s.endPage)
                }}
                disabled={bulkMark.isPending}
                className="bg-green-700 text-white rounded-lg px-4 py-2 text-sm font-bold disabled:opacity-50 whitespace-nowrap"
              >
                Mark
              </button>
            </div>

            <div className="text-xs uppercase tracking-widest text-slate-500 mb-2">
              Or custom page range
            </div>
            <div className="flex gap-2 items-center mb-3">
              <input
                type="number"
                min={1}
                max={604}
                value={from}
                onChange={(e) => setFrom(Number(e.target.value))}
                className="flex-1 bg-[#0f172a] border border-[#334155] text-white rounded-lg px-3 py-2 text-sm"
                placeholder="From"
              />
              <span className="text-slate-500 text-sm">→</span>
              <input
                type="number"
                min={1}
                max={604}
                value={to}
                onChange={(e) => setTo(Number(e.target.value))}
                className="flex-1 bg-[#0f172a] border border-[#334155] text-white rounded-lg px-3 py-2 text-sm"
                placeholder="To"
              />
            </div>
            <button
              onClick={() => handleBulk(from, to)}
              disabled={bulkMark.isPending}
              className="w-full bg-green-700 text-white rounded-xl py-2.5 text-sm font-bold disabled:opacity-50"
            >
              {bulkMark.isPending
                ? 'Saving…'
                : `Mark pages ${Math.min(from, to)}–${Math.max(from, to)} as memorised`}
            </button>

            {confirmCount !== null && (
              <div className="mt-3 text-green-400 text-xs text-center">
                ✓ Marked {confirmCount} pages as memorised. Revisions spread over next 2 weeks.
              </div>
            )}
            <p className="text-[10px] text-slate-500 mt-3 leading-relaxed">
              Sets pages as memorised with moderate starting strength. Reviews are
              spread over 14 days so you're not flooded day one.
            </p>
          </div>
        )}

        <div
          className="grid gap-0.5 mb-6"
          style={{ gridTemplateColumns: 'repeat(20, minmax(0, 1fr))' }}
        >
          {Array.from({ length: 604 }, (_, i) => i + 1).map((n) => (
            <PageCell
              key={n}
              n={n}
              color={getPageColor(pageMap.get(n))}
              selected={selected === n}
              onClick={() => setSelected(selected === n ? null : n)}
            />
          ))}
        </div>

        <div className="flex gap-3 flex-wrap mb-6">
          {[
            { color: 'bg-green-700', label: 'Strong' },
            { color: 'bg-green-500', label: 'Solid' },
            { color: 'bg-amber-500', label: 'Okay' },
            { color: 'bg-red-600', label: 'Weak' },
            { color: 'bg-blue-600', label: 'Learning' },
            { color: 'bg-[#0f172a] border border-[#1e293b]', label: 'Not started' },
          ].map((l) => (
            <div key={l.label} className="flex items-center gap-1.5">
              <div className={`w-3 h-3 rounded-sm ${l.color}`} />
              <span className="text-xs text-slate-500">{l.label}</span>
            </div>
          ))}
        </div>

        {selected && (
          <div className="bg-[#1e293b] rounded-2xl p-4 mb-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="text-lg font-bold">Page {selected}</div>
                {selectedPage ? (
                  <div className="text-xs text-slate-400 mt-0.5">
                    {selectedPage.pages.surah_name} · Juz {selectedPage.pages.juz}
                    <br />
                    Strength: {selectedPage.strength.toFixed(1)} · Next review:{' '}
                    {selectedPage.next_review_date}
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 mt-0.5">Not yet memorised</div>
                )}
              </div>
              <button onClick={() => setSelected(null)} className="text-slate-500 text-sm">
                ✕
              </button>
            </div>

            {selectedPage && (
              <div>
                <div className="text-xs uppercase tracking-widest text-slate-500 mb-2">
                  Set Status
                </div>
                <div className="flex gap-2">
                  {STATUS_OPTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => graduate.mutate({ page_number: selected, to: s })}
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold capitalize
                        ${
                          selectedPage.status === s
                            ? 'bg-blue-700 text-white'
                            : 'bg-[#0f172a] text-slate-400 border border-[#334155]'
                        }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
    </PageTransition>
  )
}
