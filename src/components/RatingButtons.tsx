import type { Rating } from '../types'

interface Props {
  selected: Rating | null
  onSelect: (r: Rating) => void
}

const ratings: {
  value: Rating
  emoji: string
  label: string
  sub: string
  color: string
  activeColor: string
}[] = [
  {
    value: 'weak',
    emoji: '😓',
    label: 'Weak',
    sub: 'Struggled',
    color: 'border-red-700 text-red-400',
    activeColor: 'bg-red-950 border-red-500',
  },
  {
    value: 'okay',
    emoji: '🙂',
    label: 'Okay',
    sub: 'Some gaps',
    color: 'border-amber-700 text-amber-400',
    activeColor: 'bg-amber-950 border-amber-500',
  },
  {
    value: 'strong',
    emoji: '💪',
    label: 'Strong',
    sub: 'Fluent',
    color: 'border-green-700 text-green-400',
    activeColor: 'bg-green-950 border-green-500',
  },
]

export function RatingButtons({ selected, onSelect }: Props) {
  return (
    <div className="flex gap-2">
      {ratings.map((r) => (
        <button
          key={r.value}
          onClick={() => onSelect(r.value)}
          aria-pressed={selected === r.value}
          className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-xl border transition-colors
            ${selected === r.value ? r.activeColor : 'bg-transparent border-slate-700'} ${r.color}`}
        >
          <span className="text-xl">{r.emoji}</span>
          <span className="text-sm font-bold">{r.label}</span>
          <span className="text-xs opacity-70">{r.sub}</span>
        </button>
      ))}
    </div>
  )
}
