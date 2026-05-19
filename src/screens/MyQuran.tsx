import { memo, useState } from 'react'
import { useUserPagesQuery, useGraduatePage } from '../hooks/useUserPages'
import { BottomNav } from '../components/BottomNav'
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

export function MyQuran() {
  const { data: pages = [] } = useUserPagesQuery()
  const graduate = useGraduatePage()
  const [selected, setSelected] = useState<number | null>(null)

  const pageMap = new Map(pages.map((p) => [p.page_number, p]))
  const selectedPage = selected ? pageMap.get(selected) : null

  return (
    <div className="min-h-screen bg-[#0f1117] text-white pb-24">
      <div className="max-w-lg mx-auto px-4 pt-5">
        <h1 className="text-xl font-bold mb-5">My Quran</h1>

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
      <BottomNav />
    </div>
  )
}
