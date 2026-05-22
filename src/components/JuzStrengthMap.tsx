import type { UserPageWithMeta } from '../hooks/useUserPages'

interface Props {
  userPages: UserPageWithMeta[]
  onJuzClick?: (juz: number) => void
}

function colorForJuz(pages: UserPageWithMeta[]): string {
  if (pages.length === 0)
    return 'bg-[#0f131b] border border-white/[0.05] text-slate-700'
  if (pages.some((p) => p.status === 'learning')) return 'bg-indigo-500 text-white'
  const avg = pages.reduce((s, p) => s + p.strength, 0) / pages.length
  if (avg >= 4) return 'bg-green-700 text-white'
  if (avg >= 3) return 'bg-green-500 text-white'
  if (avg >= 2.5) return 'bg-amber-500 text-white'
  if (avg >= 1.8) return 'bg-orange-500 text-white'
  return 'bg-red-600 text-white'
}

export function JuzStrengthMap({ userPages, onJuzClick }: Props) {
  const byJuz = new Map<number, UserPageWithMeta[]>()
  for (const p of userPages) {
    const list = byJuz.get(p.pages.juz) ?? []
    list.push(p)
    byJuz.set(p.pages.juz, list)
  }

  return (
    <div className="bg-[#151a23] rounded-2xl p-4">
      <h3 className="text-sm font-semibold text-slate-400 mb-3">Juz Strength Map</h3>
      <div className="grid grid-cols-10 gap-1">
        {Array.from({ length: 30 }, (_, i) => i + 1).map((juz) => {
          const pages = byJuz.get(juz) ?? []
          return (
            <button
              key={juz}
              onClick={() => onJuzClick?.(juz)}
              aria-label={`Juz ${juz}, ${pages.length} pages tracked`}
              className={`aspect-square rounded-md flex items-center justify-center text-[9px] font-bold ${colorForJuz(pages)}`}
            >
              {juz}
            </button>
          )
        })}
      </div>
      <div className="flex gap-3 flex-wrap mt-3">
        {[
          { color: 'bg-green-500', label: 'Solid' },
          { color: 'bg-amber-500', label: 'Okay' },
          { color: 'bg-red-600', label: 'Weak' },
          { color: 'bg-indigo-500', label: 'Learning' },
          { color: 'bg-[#0f131b] border border-white/[0.05]', label: 'Not started' },
        ].map((l) => (
          <div key={l.label} className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-sm ${l.color}`} />
            <span className="text-[10px] text-slate-500">{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
