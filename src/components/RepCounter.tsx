interface Props {
  label: string
  count: number
  target: number
  color: 'blue' | 'purple'
  onAdd: () => void
}

export function RepCounter({ label, count, target, color, onAdd }: Props) {
  const dots = Array.from({ length: target }, (_, i) => i)
  const colorMap = {
    blue: { dot: 'bg-blue-500', btn: 'bg-blue-600 hover:bg-blue-500' },
    purple: { dot: 'bg-purple-500', btn: 'bg-purple-600 hover:bg-purple-500' },
  }
  const c = colorMap[color]

  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-semibold text-slate-300">{label}</span>
        <span className="text-lg font-bold text-white">
          {count} <span className="text-sm text-slate-500">/ {target}</span>
        </span>
      </div>
      <div className="flex flex-wrap gap-1 mb-3">
        {dots.map((i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full ${i < count ? c.dot : 'bg-white/10'}`}
          />
        ))}
      </div>
      <button
        onClick={onAdd}
        disabled={count >= target}
        className={`w-full ${c.btn} text-white rounded-xl py-3 font-semibold disabled:opacity-40 transition-colors`}
      >
        + Log rep
      </button>
    </div>
  )
}
