import { useStreak } from '../hooks/useStreak'

const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

function dayLetter(dateStr: string): string {
  // dateStr is yyyy-MM-dd. Parse manually so timezone math stays local.
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  // getDay: 0=Sun ... 6=Sat. Map to M-T-W-T-F-S-S = index 0..6.
  const idx = (date.getDay() + 6) % 7
  return DAY_LETTERS[idx]
}

export function StreakBar() {
  const { data, isLoading } = useStreak()
  if (isLoading || !data) {
    return (
      <div className="bg-[#151a23] rounded-2xl p-4 mb-5 h-[80px] animate-pulse" />
    )
  }

  return (
    <div className="bg-[#151a23] rounded-2xl p-4 mb-5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="text-3xl">🔥</div>
          <div>
            <div className="text-2xl font-extrabold text-amber-400 leading-none">
              {data.current}
            </div>
            <div className="text-[10px] uppercase tracking-widest text-slate-500 mt-1">
              {data.current === 1 ? 'day streak' : 'day streak'}
            </div>
          </div>
        </div>
        <div className="flex gap-1.5 items-end">
          {data.last7.map((d, i) => {
            const isToday = i === data.last7.length - 1
            return (
              <div key={d.date} className="flex flex-col items-center gap-1">
                <div
                  className={`w-5 h-10 rounded transition-colors ${
                    d.active
                      ? 'bg-amber-400'
                      : isToday
                        ? 'bg-[#0f131b] border border-amber-400/40'
                        : 'bg-[#0f131b] border border-white/[0.06]'
                  }`}
                  title={`${d.date}${d.active ? ' · active' : ''}`}
                />
                <span
                  className={`text-[10px] font-semibold ${
                    isToday ? 'text-amber-400' : 'text-slate-600'
                  }`}
                >
                  {dayLetter(d.date)}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
